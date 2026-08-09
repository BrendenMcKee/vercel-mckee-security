import "server-only";
import { recordPortalAlert } from "@/lib/portal/alerts";
import { balanceDue, isPaidInFull } from "@/lib/starlink/billing";
import {
  addDaysIso,
  daysBetweenInclusive,
  isoDateInToronto,
  todayIsoToronto,
} from "@/lib/starlink/dates";
import {
  formatCurrency,
  formatDateMedium,
  formatDateShort,
  formatRelative,
} from "@/lib/starlink/format";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/starlink/supabase-admin";
import type { RentalWithUnit } from "@/lib/starlink/types";
import {
  sendDepositOverdueReminder,
  sendPaymentBeforePickupReminder,
  sendPickupTodayReminder,
  sendRentalActionDigest,
  type ActionPriority,
  type RentalActionGroup,
  type RentalActionItem,
} from "./reminder-emails";

/**
 * The internal reminder job for Starlink rentals, run once a day by
 * /api/cron/daily. It covers two kinds of forgetting:
 *
 * - Something is happening today or shortly: a customer is collecting a kit, or
 *   a booking is about to go out unpaid. Each of those is sent once, guarded by
 *   the `rental_reminders` table.
 * - Something should already have been done: the kit is late back, a deposit is
 *   still sitting with us, a request never got a reply. Those go in one daily
 *   digest and keep coming back until the booking is put right.
 */

/** How early an unpaid booking gets chased before its pickup date. */
const PAYMENT_LEAD_DAYS = 2;

/** Grace given to a website request before it counts as unanswered. */
const REQUEST_REPLY_GRACE_DAYS = 1;

/**
 * How far back *finished* bookings are still chased. Beyond this a stale row
 * would nag forever, which trains people to ignore the email. Open bookings are
 * never aged out; see the query below.
 */
const LOOKBACK_DAYS = 120;

const RENTAL_SELECT = "*, unit:units(id,name,color,active)";

type ReminderKind =
  | "pickup_today"
  | "payment_before_pickup"
  | "deposit_overdue";

export type StarlinkReminderSummary = {
  pickupToday: number;
  paymentBeforePickup: number;
  /** Standalone escalations for deposits we are still sitting on. */
  depositOverdue: number;
  digestItems: number;
  /** Distinguishes "nothing needed doing" from "we could not tell anyone". */
  digestStatus: "sent" | "nothing-to-send" | "failed";
  /** Anything that stopped part of the run from completing. */
  notes?: string[];
};

/** "1 day" / "3 days", so no reminder ever says "1 days" or "day(s)". */
function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Whole days elapsed from `iso` up to `today`, floored at zero. */
function daysSince(iso: string, today: string): number {
  return Math.max(0, daysBetweenInclusive(iso, today) - 1);
}

/**
 * The day a deposit became the customer's to get back. Normally the return
 * date. For a booking cancelled before it ever started that date is in the
 * future, so the cancellation itself starts the clock, which `updated_at`
 * approximates well enough. Never later than today.
 */
function depositOwedSince(rental: RentalWithUnit, today: string): string {
  const changed = isoDateInToronto(rental.updated_at);
  const earliest =
    changed && changed < rental.return_date ? changed : rental.return_date;
  return earliest > today ? today : earliest;
}

/** How long a finished rental's deposit can sit before the tone changes. */
const DEPOSIT_OVERDUE_AFTER_DAYS = 1;

/** How close a pickup has to be before an unreserved booking becomes urgent. */
const UNIT_URGENT_WITHIN_DAYS = 2;

/** Where a booking's pickup sits relative to today, for an at-a-glance chip. */
function pickupProximity(pickupIso: string, today: string): string {
  if (pickupIso === today) return "picks up today";
  if (pickupIso < today) {
    return `pickup was ${plural(daysSince(pickupIso, today), "day")} ago`;
  }
  return `picks up in ${plural(daysSince(today, pickupIso), "day")}`;
}

type GroupSpec = {
  /** One glyph, so the section can be found in the email without reading it. */
  icon: string;
  priority: ActionPriority;
  /** Imperative, and counted: "Send 2 deposits back". */
  action: (count: number) => string;
  /** Subject-line fragment: "2 deposits to send back". */
  summary: (count: number) => string;
  /** What doing it involves, including which box to tick afterwards. */
  instruction: string;
};

function group(
  spec: GroupSpec,
  rentals: RentalWithUnit[],
  detail: (r: RentalWithUnit) => string,
  flag?: (r: RentalWithUnit) => string | undefined,
): RentalActionGroup | null {
  if (rentals.length === 0) return null;
  const items = rentals.map<RentalActionItem>((rental) => {
    const mark = flag?.(rental);
    return {
      rentalId: rental.id,
      customerName: rental.customer_name,
      detail: detail(rental),
      ...(mark ? { flag: mark } : {}),
    };
  });
  return {
    icon: spec.icon,
    priority: spec.priority,
    action: spec.action(rentals.length),
    summary: spec.summary(rentals.length),
    instruction: spec.instruction,
    items,
  };
}

function unitSuffix(rental: RentalWithUnit): string {
  return rental.unit ? rental.unit.name : "no unit assigned";
}

/** Finished bookings where we took a deposit and still have it. */
function depositsAwaitingReturn(rentals: RentalWithUnit[]): RentalWithUnit[] {
  return rentals.filter(
    (r) =>
      r.deposit_received &&
      !r.deposit_returned &&
      (r.status === "returned" || r.status === "cancelled"),
  );
}

function depositAmountLine(rental: RentalWithUnit): string {
  return rental.deposit_amount === null
    ? "Amount not recorded"
    : `${formatCurrency(rental.deposit_amount)} held`;
}

/**
 * Bookings that still need something done to them, most urgent first. Exported
 * for `scripts/email-render-check.mjs`, which drives it with bookings contrived
 * to sit either side of each threshold — the part of this job most likely to be
 * got wrong is which section a booking lands in, not how it renders.
 */
export function buildDigestGroups(
  rentals: RentalWithUnit[],
  today: string,
  failedPickupsToday: RentalWithUnit[] = [],
): RentalActionGroup[] {
  // created_at is a UTC timestamp and `today` is a Toronto calendar date, so
  // the grace period is measured as elapsed time rather than by comparing the
  // two date strings, which would run a day late all evening.
  const requestCutoff = Date.now() - REQUEST_REPLY_GRACE_DAYS * 86_400_000;
  const paymentWindowEnd = addDaysIso(today, PAYMENT_LEAD_DAYS);

  const overdueReturns = rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") &&
      r.return_date < today,
  );

  // Split by how long we have sat on it. Day one is a job for today; after
  // that it is the customer's money going missing and the tone changes, both
  // here and in the standalone escalation email.
  const depositsOwed = depositsAwaitingReturn(rentals);
  const depositsOverdue = depositsOwed.filter(
    (r) => daysSince(depositOwedSince(r, today), today) >= DEPOSIT_OVERDUE_AFTER_DAYS,
  );
  const depositsDueNow = depositsOwed.filter(
    (r) => daysSince(depositOwedSince(r, today), today) < DEPOSIT_OVERDUE_AFTER_DAYS,
  );

  // Includes bookings still sitting at Confirmed on or after their pickup day:
  // the kit is with the customer whether or not the status says so.
  const unpaid = rentals.filter(
    (r) =>
      (r.status === "active" ||
        r.status === "returned" ||
        (r.status === "confirmed" && r.pickup_date <= today)) &&
      r.quoted_price != null &&
      r.quoted_price > 0 &&
      !isPaidInFull(r),
  );

  // No price at all, so there is nothing to chase for payment yet. Left alone
  // until pickup is close, otherwise a booking taken weeks ahead nags daily.
  const noPrice = rentals.filter(
    (r) =>
      r.quoted_price === null &&
      (r.status === "active" ||
        r.status === "returned" ||
        (r.status === "confirmed" && r.pickup_date <= paymentWindowEnd)),
  );

  // Without a unit the overlap constraint has nothing to protect, so these
  // dates are not actually reserved and can be double-booked.
  const noUnit = rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") && r.unit_id === null,
  );

  // Pickup day has been and gone but nobody moved it to Out. Bookings already
  // listed as overdue returns are left out; that is the more urgent framing.
  const notMarkedOut = rentals.filter(
    (r) =>
      r.status === "confirmed" &&
      r.pickup_date < today &&
      r.return_date >= today,
  );

  const staleRequests = rentals.filter(
    (r) => r.status === "requested" && Date.parse(r.created_at) <= requestCutoff,
  );

  // An unreserved booking is always a problem, but it only outranks everything
  // else once the customer is nearly at the counter.
  const noUnitIsUrgent = noUnit.some(
    (r) => r.pickup_date <= addDaysIso(today, UNIT_URGENT_WITHIN_DAYS),
  );

  // Every heading below is an instruction, not a diagnosis: "Send 2 deposits
  // back" rather than "Deposit still to go back", because the person reading
  // this at 8am should not have to work out what is being asked of them.
  return [
    group(
      {
        icon: "⚠️",
        priority: "urgent",
        action: (n) => `Get ${plural(n, "kit")} ready for pickup today`,
        summary: (n) => `${plural(n, "pickup")} today`,
        instruction:
          "The pickup reminder for these could not be delivered, so they are here instead. Check the kit over and set it aside before the customer arrives.",
      },
      failedPickupsToday,
      (r) =>
        `Collecting today${r.pickup_time ? ` at ${r.pickup_time}` : ""} · ${unitSuffix(r)}`,
      () => "today",
    ),
    group(
      {
        icon: "⏰",
        priority: "urgent",
        action: (n) =>
          `Chase ${plural(n, "kit")} that ${n === 1 ? "is" : "are"} late back`,
        summary: (n) => `${plural(n, "kit")} late back`,
        instruction:
          "The return date has passed and these are still booked out. Ring the customer to arrange the drop-off, then set the booking to Returned once the kit is in. If they are keeping it longer, push the return date out instead so the calendar is honest.",
      },
      overdueReturns,
      (r) => `Was due back ${formatDateMedium(r.return_date)} · ${unitSuffix(r)}`,
      (r) => `${plural(daysSince(r.return_date, today), "day")} late`,
    ),
    group(
      {
        icon: "💵",
        priority: "urgent",
        action: (n) => `Send ${plural(n, "deposit")} back — overdue`,
        summary: (n) => `${plural(n, "deposit")} overdue`,
        instruction:
          "This is the customer's own money and the rental is already over. Send it back today, then tick Deposit returned on the booking. Each of these also gets its own email until it is done.",
      },
      depositsOverdue,
      (r) =>
        `${depositAmountLine(r)} · owed since ${formatDateMedium(
          depositOwedSince(r, today),
        )}`,
      (r) =>
        `${plural(daysSince(depositOwedSince(r, today), today), "day")} overdue`,
    ),
    group(
      {
        icon: "💵",
        priority: "today",
        action: (n) => `Send ${plural(n, "deposit")} back`,
        summary: (n) => `${plural(n, "deposit")} to send back`,
        instruction:
          "The rental has just finished, so the deposit is due back. Send it, then tick Deposit returned on the booking — otherwise this starts chasing you tomorrow.",
      },
      depositsDueNow,
      (r) => `${depositAmountLine(r)} · rental ended ${formatDateMedium(r.return_date)}`,
      () => "due today",
    ),
    group(
      {
        icon: "🛰️",
        priority: noUnitIsUrgent ? "urgent" : "today",
        action: (n) => `Assign a kit to ${plural(n, "booking")}`,
        summary: (n) => `${plural(n, "booking")} with no kit`,
        instruction:
          "Without a unit these dates are not actually reserved, so the same days can still be sold to someone else. Pick a kit on the booking.",
      },
      noUnit,
      (r) =>
        `${formatDateShort(r.pickup_date)} to ${formatDateShort(
          r.return_date,
        )} · marked ${r.status}`,
      (r) => pickupProximity(r.pickup_date, today),
    ),
    group(
      {
        icon: "💳",
        priority: "today",
        action: (n) => `Check ${plural(n, "payment")}`,
        summary: (n) => `${plural(n, "payment")} to check`,
        instruction:
          "The kit has gone out but the booking is not marked paid. Confirm whether the money arrived, then tick Paid in full.",
      },
      unpaid,
      (r) =>
        `${formatCurrency(balanceDue(r))} of ${formatCurrency(
          r.quoted_price,
        )} still owed · picked up ${formatDateMedium(r.pickup_date)}`,
    ),
    group(
      {
        icon: "✉️",
        priority: "today",
        action: (n) => `Reply to ${plural(n, "website request")}`,
        summary: (n) => `${plural(n, "request")} to answer`,
        instruction:
          "These came in through the website and have not been quoted yet. Send them pricing, then confirm or cancel the request.",
      },
      staleRequests,
      (r) =>
        `Wants ${formatDateShort(r.pickup_date)} to ${formatDateShort(
          r.return_date,
        )} · asked ${formatRelative(r.created_at)}`,
      (r) =>
        `waiting ${plural(
          daysSince(isoDateInToronto(r.created_at) ?? today, today),
          "day",
        )}`,
    ),
    group(
      {
        icon: "🏷️",
        priority: "today",
        action: (n) => `Put a price on ${plural(n, "booking")}`,
        summary: (n) => `${plural(n, "booking")} to price`,
        instruction:
          "No rental price is recorded on these, so nothing will ever show as owed and there is nothing to invoice against. Add the price you quoted.",
      },
      noPrice,
      (r) =>
        `${formatDateShort(r.pickup_date)} to ${formatDateShort(
          r.return_date,
        )} · ${unitSuffix(r)}`,
    ),
    group(
      {
        icon: "📤",
        priority: "soon",
        action: (n) => `Mark ${plural(n, "booking")} as Out`,
        summary: (n) => `${plural(n, "booking")} to mark Out`,
        instruction:
          "Pickup day has passed but these still say Confirmed. If the customer has the kit, set the status to Out so the calendar and the kit availability are right.",
      },
      notMarkedOut,
      (r) => `Pickup was ${formatDateMedium(r.pickup_date)} · ${unitSuffix(r)}`,
    ),
  ].filter((entry): entry is RentalActionGroup => entry !== null);
}

/**
 * Time-sensitive reminders, sent once each. The guard row is written only after
 * the email actually goes out, so a failed send is retried rather than silently
 * swallowed. Pickup reminders have no tomorrow, so a failure is handed back for
 * the digest to carry instead.
 */
async function runOneShotReminders(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rentals: RentalWithUnit[],
  today: string,
): Promise<{
  pickupToday: number;
  paymentBeforePickup: number;
  depositOverdue: number;
  failedPickupsToday: RentalWithUnit[];
}> {
  const paymentWindowEnd = addDaysIso(today, PAYMENT_LEAD_DAYS);

  const { data: guards, error: guardError } = await supabase
    .from("rental_reminders")
    .select("rental_id, kind, sent_for")
    .gte("sent_for", today);

  if (guardError) {
    throw new Error(`rental_reminders lookup failed: ${guardError.message}`);
  }

  const alreadySent = new Set(
    (guards ?? []).map((g) => `${g.rental_id}|${g.kind}|${g.sent_for}`),
  );

  type Outcome = "sent" | "skipped" | "failed";

  async function deliver(
    rental: RentalWithUnit,
    kind: ReminderKind,
    sentFor: string,
    sendIt: () => Promise<boolean>,
  ): Promise<Outcome> {
    if (alreadySent.has(`${rental.id}|${kind}|${sentFor}`)) return "skipped";
    if (!(await sendIt())) return "failed";

    const { error } = await supabase
      .from("rental_reminders")
      .insert({ rental_id: rental.id, kind, sent_for: sentFor });
    if (error) {
      // The email is out; only the bookkeeping failed. Worst case it goes out
      // again tomorrow, which is far better than losing it.
      console.error(`[starlink] ${kind} guard insert failed:`, error.message);
    }
    return "sent";
  }

  let pickupToday = 0;
  const failedPickupsToday: RentalWithUnit[] = [];
  for (const rental of rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") &&
      r.pickup_date === today,
  )) {
    const outcome = await deliver(rental, "pickup_today", rental.pickup_date, () =>
      sendPickupTodayReminder(rental),
    );
    if (outcome === "sent") pickupToday += 1;
    if (outcome === "failed") failedPickupsToday.push(rental);
  }

  // Pickup day itself is covered by the reminder above, which already flags an
  // unpaid booking, so this only looks at the days leading up to it.
  let paymentBeforePickup = 0;
  for (const rental of rentals.filter(
    (r) =>
      r.status === "confirmed" &&
      r.pickup_date > today &&
      r.pickup_date <= paymentWindowEnd &&
      !isPaidInFull(r),
  )) {
    const daysUntilPickup = daysBetweenInclusive(today, rental.pickup_date) - 1;
    const outcome = await deliver(
      rental,
      "payment_before_pickup",
      rental.pickup_date,
      () => sendPaymentBeforePickupReminder(rental, daysUntilPickup),
    );
    if (outcome === "sent") paymentBeforePickup += 1;
  }

  // Deposits are the one case where the money is the customer's, so a line in
  // the digest is not enough once it has gone past a day. `sent_for` is today's
  // date rather than a fixed one, so this repeats daily — each with the day
  // count in the subject — until someone ticks Deposit returned.
  let depositOverdue = 0;
  for (const rental of depositsAwaitingReturn(rentals)) {
    const days = daysSince(depositOwedSince(rental, today), today);
    if (days < DEPOSIT_OVERDUE_AFTER_DAYS) continue;
    const outcome = await deliver(rental, "deposit_overdue", today, () =>
      sendDepositOverdueReminder(rental, days),
    );
    if (outcome === "sent") depositOverdue += 1;
  }

  return {
    pickupToday,
    paymentBeforePickup,
    depositOverdue,
    failedPickupsToday,
  };
}

export async function runStarlinkReminderJob(): Promise<StarlinkReminderSummary> {
  if (!isSupabaseConfigured()) {
    return {
      pickupToday: 0,
      paymentBeforePickup: 0,
      depositOverdue: 0,
      digestItems: 0,
      digestStatus: "nothing-to-send",
      notes: ["Supabase is not configured; nothing to check."],
    };
  }

  const supabase = getSupabaseAdmin();
  const today = todayIsoToronto();
  const notes: string[] = [];

  // Finished bookings age out, but anything still open stays in scope however
  // old it is: a kit that went out months ago and was never marked back is
  // exactly what this job exists to catch.
  const { data, error } = await supabase
    .from("rentals")
    .select(RENTAL_SELECT)
    .or(
      `return_date.gte.${addDaysIso(today, -LOOKBACK_DAYS)},status.in.(requested,confirmed,active)`,
    )
    .order("pickup_date", { ascending: true });

  if (error) throw new Error(`rentals query failed: ${error.message}`);

  const rentals = (data ?? []) as unknown as RentalWithUnit[];

  // The one-shot reminders need the guard table; the digest does not. Keep the
  // digest working even if the guard lookup fails, since it is the safety net.
  let oneShots = {
    pickupToday: 0,
    paymentBeforePickup: 0,
    depositOverdue: 0,
    failedPickupsToday: [] as RentalWithUnit[],
  };
  try {
    oneShots = await runOneShotReminders(supabase, rentals, today);
  } catch (err) {
    notes.push(err instanceof Error ? err.message : String(err));
    console.error("[starlink] one-shot reminders skipped:", err);
  }
  if (oneShots.failedPickupsToday.length > 0) {
    notes.push(
      `${oneShots.failedPickupsToday.length} pickup reminder(s) failed to send`,
    );
  }

  const groups = buildDigestGroups(rentals, today, oneShots.failedPickupsToday);
  // One booking can need two different things done to it, so count bookings
  // rather than rows to keep the subject line honest.
  const digestItems = new Set(
    groups.flatMap((g) => g.items.map((item) => item.rentalId)),
  ).size;

  let digestStatus: StarlinkReminderSummary["digestStatus"] = "nothing-to-send";
  if (groups.length > 0) {
    digestStatus = (await sendRentalActionDigest(groups)) ? "sent" : "failed";
    if (digestStatus === "failed") notes.push("action digest failed to send");
  }

  // A cron that reports success while nobody is being told anything is the
  // worst outcome here, so every partial failure surfaces in the Alerts tab.
  if (notes.length > 0) {
    await recordPortalAlert(
      "cron_failure",
      `Starlink reminders: ${notes.join("; ")}`,
      { job: "starlink-reminders", date: today, digestItems },
    );
  }

  return {
    pickupToday: oneShots.pickupToday,
    paymentBeforePickup: oneShots.paymentBeforePickup,
    depositOverdue: oneShots.depositOverdue,
    digestItems,
    digestStatus,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
