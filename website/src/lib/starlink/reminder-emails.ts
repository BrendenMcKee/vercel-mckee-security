import "server-only";
import { sendEmail } from "@/lib/email";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  type EmailField,
} from "@/lib/email-templates";
import { siteConfig } from "@/lib/site-config";
import { balanceDue, isPaidInFull } from "@/lib/starlink/billing";
import { daysBetweenInclusive } from "@/lib/starlink/dates";
import { formatCurrency, formatDateMedium } from "@/lib/starlink/format";
import type { RentalWithUnit } from "@/lib/starlink/types";

/**
 * Internal reminder emails for the Starlink rental system. These go to whoever
 * runs the bookings day to day, never to the customer, and every one of them
 * links straight to the booking it is about so the fix is one click away.
 */

/** Andi manages the bookings; a comma-separated env var can redirect or widen it. */
const DEFAULT_RECIPIENT = "andi@mckeesecurity.ca";

const BASE_URL = siteConfig.url.replace(/\/$/, "");
const ADMIN_URL = `${BASE_URL}/starlink-admin`;

export function reminderRecipients(): string[] {
  const configured = (process.env.STARLINK_REMINDER_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : [DEFAULT_RECIPIENT];
}

/** Opens the Starlink admin with this booking's details already showing. */
export function rentalAdminUrl(rentalId: string): string {
  return `${ADMIN_URL}?rental=${rentalId}`;
}

const FOOTER_HTML = `Automatic reminder from the Starlink rental system &nbsp;&bull;&nbsp;
  <a href="${ADMIN_URL}" style="color:#c91818;text-decoration:none;font-weight:600;">Starlink admin</a>
  &nbsp;&bull;&nbsp; (705) 457-2156`;

const FOOTER_TEXT = [
  `Automatic reminder from the Starlink rental system | ${ADMIN_URL}`,
];

/**
 * The body is built inside the boundary as well as sent inside it: a reminder
 * that cannot be rendered must not take down the job that is trying to warn
 * someone about a booking.
 */
async function send(
  label: string,
  build: () => Parameters<typeof sendEmail>[0],
): Promise<boolean> {
  try {
    const sent = await sendEmail({ to: reminderRecipients(), ...build() });
    if (!sent) {
      console.warn(`[starlink] ${label} not sent (email service not configured).`);
    }
    return sent;
  } catch (error) {
    console.error(`[starlink] ${label} failed:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Shared summary lines
// ---------------------------------------------------------------------------

function scheduleLine(rental: RentalWithUnit): string {
  const pickup = formatDateMedium(rental.pickup_date);
  const timed = rental.pickup_time ? `${pickup} at ${rental.pickup_time}` : pickup;
  return `${timed} to ${formatDateMedium(rental.return_date)} (${daysBetweenInclusive(
    rental.pickup_date,
    rental.return_date,
  )} days)`;
}

function unitLine(rental: RentalWithUnit): string {
  return rental.unit
    ? rental.unit.name
    : "No unit assigned yet. Assign one so the dates are actually reserved.";
}

function paymentLine(rental: RentalWithUnit): string {
  if (rental.quoted_price == null || rental.quoted_price <= 0) {
    return "No price set on this booking yet.";
  }
  if (isPaidInFull(rental)) {
    return `Paid in full, ${formatCurrency(rental.quoted_price)}.`;
  }
  return `${formatCurrency(balanceDue(rental))} still owed of ${formatCurrency(
    rental.quoted_price,
  )}.`;
}

function depositLine(rental: RentalWithUnit): string {
  const known = rental.deposit_amount != null && rental.deposit_amount > 0;
  const amount = known ? formatCurrency(rental.deposit_amount) : "an unrecorded amount";
  if (!rental.deposit_received) {
    return known
      ? `${amount} deposit not collected yet. Take it at pickup.`
      : "No deposit recorded on this booking.";
  }
  if (rental.deposit_returned) return `Deposit returned, ${amount}.`;
  return `Holding ${amount}. It goes back when the kit does.`;
}

function contactLine(rental: RentalWithUnit): string {
  return [rental.customer_email, rental.customer_phone]
    .filter(Boolean)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Pickup day
// ---------------------------------------------------------------------------

/** Morning-of nudge so the kit is ready before the customer turns up. */
export async function sendPickupTodayReminder(
  rental: RentalWithUnit,
): Promise<boolean> {
  const meta = {
    title: "Pickup Today",
    inboxLabel: `${rental.customer_name} collects a kit today`,
  };

  const unpaid = !isPaidInFull(rental);
  const needsDeposit = !rental.deposit_received && Boolean(rental.deposit_amount);

  const fields: EmailField[] = [
    {
      label: "Have it ready",
      value: rental.pickup_time
        ? `${rental.customer_name} is picking up around ${rental.pickup_time} today. Check the kit over and set it aside.`
        : `${rental.customer_name} is picking up today. Check the kit over and set it aside. No pickup time was recorded, so confirm one with them.`,
      highlight: true,
    },
    { label: "Rental", value: scheduleLine(rental) },
    { label: "Unit", value: unitLine(rental) },
    { label: "Customer", value: `${rental.customer_name}\n${contactLine(rental)}` },
    ...(rental.usage_location
      ? [{ label: "Where it is going", value: rental.usage_location }]
      : []),
    { label: "Payment", value: paymentLine(rental), highlight: unpaid },
    { label: "Deposit", value: depositLine(rental), highlight: needsDeposit },
    {
      label: "Update the booking",
      value:
        "Set the status to Out once the kit leaves, and tick off anything you collect at the counter.",
      href: rentalAdminUrl(rental.id),
      cta: true,
      buttonLabel: "Open this rental",
    },
  ];

  // Compact on purpose: sendEmail prefixes every subject with "McKee Security |",
  // which already spends 17 characters of the width clients truncate at.
  const kit = rental.unit ? `, ${rental.unit.name}` : "";
  return send("pickup-today reminder", () => ({
    subject: rental.pickup_time
      ? `🚚 Pickup today ${rental.pickup_time}: ${rental.customer_name}${kit}`
      : `🚚 Pickup today: ${rental.customer_name}${kit}`,
    text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
  }));
}

// ---------------------------------------------------------------------------
// Payment ahead of pickup
// ---------------------------------------------------------------------------

/** Chase the money while there is still time to sort it out before pickup. */
export async function sendPaymentBeforePickupReminder(
  rental: RentalWithUnit,
  daysUntilPickup: number,
): Promise<boolean> {
  const when =
    daysUntilPickup <= 1 ? "tomorrow" : `in ${daysUntilPickup} days`;

  const meta = {
    title: "Payment Not In Yet",
    inboxLabel: `${rental.customer_name} picks up ${when}`,
  };

  const noPrice = rental.quoted_price == null || rental.quoted_price <= 0;
  const partPaid = !noPrice && (rental.amount_received ?? 0) > 0;
  const problem = noPrice
    ? "there is still no price on the booking, so there is nothing to invoice"
    : partPaid
      ? "only part of the money is in"
      : "no payment is recorded against this booking";

  const fields: EmailField[] = [
    {
      label: noPrice ? "Price this booking" : "Chase the payment",
      value: `${rental.customer_name} picks up ${when} and ${problem}.${
        noPrice ? "" : ` ${paymentLine(rental)}`
      }`,
      highlight: true,
    },
    { label: "Rental", value: scheduleLine(rental) },
    { label: "Unit", value: unitLine(rental) },
    { label: "Customer", value: `${rental.customer_name}\n${contactLine(rental)}` },
    { label: "Deposit", value: depositLine(rental) },
    {
      label: "Once it lands",
      value:
        "Tick Paid in full on the booking. If they are paying at the counter instead, leave it and collect on pickup day.",
      href: rentalAdminUrl(rental.id),
      cta: true,
      buttonLabel: "Open this rental",
    },
  ];

  return send("payment-before-pickup reminder", () => ({
    subject: noPrice
      ? `🏷️ Price this booking: ${rental.customer_name} picks up ${when}`
      : `💳 Collect ${formatCurrency(balanceDue(rental))} from ${rental.customer_name}, picks up ${when}`,
    text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
  }));
}

// ---------------------------------------------------------------------------
// Deposit still not sent back
// ---------------------------------------------------------------------------

/**
 * The escalation for a deposit nobody has sent back. A line in the daily digest
 * is easy to skim past, and this is the one item in the whole system where the
 * money is the customer's rather than ours, so once it has sat for a day it gets
 * its own email with the amount and the person in the subject.
 */
export async function sendDepositOverdueReminder(
  rental: RentalWithUnit,
  daysOverdue: number,
): Promise<boolean> {
  const amount =
    rental.deposit_amount != null && rental.deposit_amount > 0
      ? formatCurrency(rental.deposit_amount)
      : null;
  const dayCount = `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}`;

  const meta = {
    title: "Deposit Not Sent Back",
    inboxLabel: `${
      amount ?? "A deposit"
    } owed to ${rental.customer_name} for ${dayCount}`,
  };

  const fields: EmailField[] = [
    {
      label: `Overdue by ${dayCount}`,
      value: `Send ${amount ?? "the deposit"} back to ${
        rental.customer_name
      } today. The rental finished ${formatDateMedium(
        rental.return_date,
      )} and we are still holding their money. Once it is on its way, tick Deposit returned on the booking so this stops chasing you.`,
      highlight: true,
    },
    {
      label: "Amount to send back",
      value:
        amount ??
        "No deposit amount was recorded on this booking. Check what was taken before sending anything.",
    },
    { label: "Rental", value: scheduleLine(rental) },
    { label: "Unit", value: unitLine(rental) },
    {
      label: "Reach them on",
      value: `${rental.customer_name}\n${contactLine(rental)}`,
    },
    {
      label: "Mark it done",
      value:
        "Tick Deposit returned once the money is sent. Nothing else on the booking needs changing.",
      href: rentalAdminUrl(rental.id),
      cta: true,
      buttonLabel: "Open this rental",
    },
  ];

  return send("deposit-overdue reminder", () => ({
    subject: `💵 Deposit overdue ${dayCount}: send ${
      amount ?? "the deposit"
    } back to ${rental.customer_name}`,
    text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
  }));
}

// ---------------------------------------------------------------------------
// Daily "action needed" digest
// ---------------------------------------------------------------------------

/**
 * How loudly a group asks to be dealt with. This drives the order of the
 * digest, the colour of the band above each section, and which action leads the
 * subject line, so that the email can be triaged without being read.
 */
export type ActionPriority = "urgent" | "today" | "soon";

export type RentalActionItem = {
  rentalId: string;
  customerName: string;
  detail: string;
  /** Per-booking urgency, e.g. "3 days overdue". Not every item has one. */
  flag?: string;
};

export type RentalActionGroup = {
  /** Imperative and countable: "Send 2 deposits back", not "Deposits". */
  action: string;
  /** One glyph, so the eye can find the section without reading it. */
  icon: string;
  priority: ActionPriority;
  /** Plain English: what doing this actually involves, including what to tick. */
  instruction: string;
  /** Subject-line fragment, e.g. "2 deposits to send back". */
  summary: string;
  items: RentalActionItem[];
};

const PRIORITY_META: Record<
  ActionPriority,
  {
    rank: number;
    /** Band text above the section heading; rendered uppercase. */
    band: string;
    labelColor: string;
    /** Subject-line prefix, so the inbox shows the worst state first. */
    subjectPrefix: string;
    chipBg: string;
    chipBorder: string;
    chipText: string;
  }
> = {
  // Every colour here is opaque hex: Outlook on Windows drops rgba() outright.
  urgent: {
    rank: 0,
    band: "Overdue · do this first",
    labelColor: "#ef4444",
    subjectPrefix: "Overdue",
    chipBg: "#3f1010",
    chipBorder: "#7f1d1d",
    chipText: "#fca5a5",
  },
  today: {
    rank: 1,
    band: "Do today",
    labelColor: "#f59e0b",
    subjectPrefix: "Today",
    chipBg: "#3a2a06",
    chipBorder: "#854d0e",
    chipText: "#fcd34d",
  },
  soon: {
    rank: 2,
    band: "When you get a chance",
    labelColor: "#94a3b8",
    subjectPrefix: "To sort",
    chipBg: "#1f2937",
    chipBorder: "#374151",
    chipText: "#cbd5e1",
  },
};

/** Urgent first. Sort is stable, so declaration order survives inside a tier. */
function byPriority(a: RentalActionGroup, b: RentalActionGroup): number {
  return PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
}

/**
 * A digest that grows without limit is one Resend rejection away from losing
 * every reminder in it, and unreadable well before that. Requests come in from
 * an unauthenticated public form, so the volume is not ours to control.
 */
const MAX_ITEMS_PER_GROUP = 25;

function shownItems(group: RentalActionGroup): {
  items: RentalActionItem[];
  hidden: number;
} {
  return {
    items: group.items.slice(0, MAX_ITEMS_PER_GROUP),
    hidden: Math.max(0, group.items.length - MAX_ITEMS_PER_GROUP),
  };
}

/**
 * Trusted HTML: every piece of booking data is escaped here, and the only
 * unescaped markup is this function's own layout.
 *
 * The shape is deliberate. The heading says what to do rather than what is
 * wrong ("Send 2 deposits back", not "Deposit still to go back"), the glyph
 * beside it lets the section be found without reading, the instruction says
 * which box to tick afterwards, and each person can carry their own urgency
 * chip so one badly overdue booking is not buried among mild ones.
 */
function groupHtml(group: RentalActionGroup): string {
  const { items: visible, hidden } = shownItems(group);
  const tone = PRIORITY_META[group.priority];

  const heading = `
      <div style="margin:0 0 5px;font-size:17px;line-height:1.35;font-weight:700;color:#ffffff;">
        <span style="font-size:19px;">${group.icon}</span>&nbsp;&nbsp;${escapeHtml(group.action)}
      </div>`;

  // The name link is padded so it is a comfortable tap on a phone: it is the
  // primary action in this email.
  const items = visible
    .map((item) => {
      const chip = item.flag
        ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;background:${tone.chipBg};border:1px solid ${tone.chipBorder};color:${tone.chipText};font-size:11px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;">${escapeHtml(item.flag)}</span>`
        : "";
      return `
      <div style="margin:12px 0 0;padding:12px 0 0;border-top:1px solid #262626;">
        <a href="${escapeHtml(rentalAdminUrl(item.rentalId))}" target="_blank" rel="noopener" style="padding:4px 0;font-size:15px;font-weight:700;color:#ffffff;text-decoration:underline;text-decoration-color:rgba(201,24,24,0.85);word-break:break-word;">
          ${escapeHtml(item.customerName)}
        </a>${chip}
        <div style="margin:4px 0 0;font-size:13px;line-height:1.55;color:#9a9a9a;">
          ${escapeHtml(item.detail)}
        </div>
      </div>`;
    })
    .join("");

  const more = hidden
    ? `<div style="margin:12px 0 0;font-size:13px;color:#9a9a9a;">and ${hidden} more in the admin portal</div>`
    : "";

  return `${heading}<div style="font-size:14px;line-height:1.6;color:#cfcfcf;">${escapeHtml(
    group.instruction,
  )}</div>${items}${more}`;
}

function groupText(group: RentalActionGroup): string {
  const { items, hidden } = shownItems(group);
  return [
    `${group.icon} ${group.action}`,
    group.instruction,
    "",
    ...items.map((item) =>
      [
        `- ${item.customerName}${item.flag ? ` [${item.flag}]` : ""}`,
        `  ${item.detail}`,
        `  ${rentalAdminUrl(item.rentalId)}`,
      ].join("\n"),
    ),
    ...(hidden ? [`- and ${hidden} more in the admin portal`] : []),
  ].join("\n");
}

/**
 * "2 deposits to send back, 1 kit late back, +2 more" — the whole point of the
 * subject is that the inbox list alone says what today needs, so it leads with
 * the most urgent group and is trimmed rather than allowed to run past the
 * width every client truncates at.
 */
function digestSubject(groups: RentalActionGroup[]): string {
  // sendEmail prefixes "McKee Security |" on top of this, so the budget here is
  // 17 characters short of what actually lands in the inbox.
  const MAX_LENGTH = 72;
  const lead = PRIORITY_META[groups[0].priority].subjectPrefix;
  const prefix = `${groups[0].icon} ${lead}: `;

  const parts: string[] = [];
  let dropped = 0;
  for (const group of groups) {
    const candidate = [...parts, group.summary].join(", ");
    // Stop at the first one that will not fit rather than skipping it and
    // trying the next. Groups arrive most urgent first, so carrying on would
    // let a shorter, less important job displace the one just dropped.
    if (parts.length > 0 && prefix.length + candidate.length > MAX_LENGTH) {
      dropped = groups.length - parts.length;
      break;
    }
    parts.push(group.summary);
  }

  return `${prefix}${parts.join(", ")}${dropped ? `, +${dropped} more` : ""}`;
}

/**
 * One email a day listing everything still waiting on someone, with a link per
 * booking. It repeats until the work is done, which is the point: this is the
 * "you meant to do this and did not" safety net.
 */
export async function sendRentalActionDigest(
  unordered: RentalActionGroup[],
): Promise<boolean> {
  const groups = [...unordered].sort(byPriority);
  // One booking can need two different things done to it, so the headline
  // counts bookings rather than rows.
  const total = new Set(
    groups.flatMap((group) => group.items.map((item) => item.rentalId)),
  ).size;
  if (total === 0 || groups.length === 0) return false;

  const anyUrgent = groups.some((group) => group.priority === "urgent");
  const meta = {
    title: anyUrgent ? "Overdue — Action Needed" : "What Needs Doing",
    // Doubles as the inbox preview line, so it lists the jobs rather than
    // repeating the subject's count.
    inboxLabel: groups.map((group) => group.summary).join(" · "),
  };

  return send("rental action digest", () => {
    // Only the overdue sections get the red highlight treatment. Marking every
    // group urgent would flatten exactly the difference this is drawing.
    const fields: EmailField[] = groups.map((group) => ({
      label: PRIORITY_META[group.priority].band,
      labelColor: PRIORITY_META[group.priority].labelColor,
      highlight: group.priority === "urgent",
      value: groupText(group),
      htmlValue: groupHtml(group),
    }));

    fields.push({
      label: "Everything at once",
      value:
        "The schedule and the full rental list are in the admin portal if you would rather work through them there.",
      href: ADMIN_URL,
      cta: true,
      buttonLabel: "Open Starlink admin",
    });

    return {
      subject: digestSubject(groups),
      text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
    };
  });
}
