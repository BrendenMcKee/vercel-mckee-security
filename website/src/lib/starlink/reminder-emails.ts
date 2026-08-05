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

  return send("pickup-today reminder", () => ({
    subject: rental.pickup_time
      ? `Pickup today: ${rental.customer_name} at ${rental.pickup_time}`
      : `Pickup today: ${rental.customer_name}`,
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
      ? `No price set, pickup ${when}: ${rental.customer_name}`
      : `Payment due before pickup: ${rental.customer_name} (${when})`,
    text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
  }));
}

// ---------------------------------------------------------------------------
// Daily "action needed" digest
// ---------------------------------------------------------------------------

export type RentalActionItem = {
  rentalId: string;
  customerName: string;
  detail: string;
};

export type RentalActionGroup = {
  label: string;
  instruction: string;
  items: RentalActionItem[];
};

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
 */
function groupHtml(group: RentalActionGroup): string {
  const { items: visible, hidden } = shownItems(group);
  const items = visible
    .map(
      (item) => `
      <div style="margin:10px 0 0;padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.1);">
        <a href="${escapeHtml(rentalAdminUrl(item.rentalId))}" target="_blank" rel="noopener" style="font-size:15px;font-weight:700;color:#ffffff;text-decoration:underline;text-decoration-color:rgba(201,24,24,0.85);">
          ${escapeHtml(item.customerName)}
        </a>
        <div style="margin:3px 0 0;font-size:13px;line-height:1.55;color:rgba(255,255,255,0.6);">
          ${escapeHtml(item.detail)}
        </div>
      </div>`,
    )
    .join("");
  const more = hidden
    ? `<div style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">and ${hidden} more in the admin portal</div>`
    : "";
  return `<span>${escapeHtml(group.instruction)}</span>${items}${more}`;
}

function groupText(group: RentalActionGroup): string {
  const { items, hidden } = shownItems(group);
  return [
    group.instruction,
    ...items.map(
      (item) =>
        `- ${item.customerName}: ${item.detail}\n  ${rentalAdminUrl(item.rentalId)}`,
    ),
    ...(hidden ? [`- and ${hidden} more in the admin portal`] : []),
  ].join("\n");
}

/**
 * One email a day listing everything still waiting on someone, with a link per
 * booking. It repeats until the work is done, which is the point: this is the
 * "you meant to do this and did not" safety net.
 */
export async function sendRentalActionDigest(
  groups: RentalActionGroup[],
): Promise<boolean> {
  // One booking can need two different things done to it, so the headline
  // counts bookings rather than rows.
  const total = new Set(
    groups.flatMap((group) => group.items.map((item) => item.rentalId)),
  ).size;
  if (total === 0) return false;

  const meta = {
    title: "Rentals Need Attention",
    inboxLabel: `${total} booking${total === 1 ? "" : "s"} waiting on you`,
  };

  return send("rental action digest", () => {
    // Deliberately not highlighted: with several groups, marking every one
    // urgent would flatten the difference. The red labels do the signposting.
    const fields: EmailField[] = groups.map((group) => ({
      label: `${group.label} (${group.items.length})`,
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
      subject: `Rentals need attention: ${total} booking${total === 1 ? "" : "s"}`,
      text: buildBrandedEmailText(meta, fields, FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, FOOTER_HTML),
    };
  });
}
