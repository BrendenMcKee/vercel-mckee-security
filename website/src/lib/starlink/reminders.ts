import "server-only";
import { recordPortalAlert } from "@/lib/portal/alerts";
import { isPaidInFull } from "@/lib/starlink/billing";
import {
  addDaysIso,
  daysBetweenInclusive,
  todayIsoToronto,
} from "@/lib/starlink/dates";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/starlink/supabase-admin";
import type { RentalWithUnit } from "@/lib/starlink/types";
import {
  DEPOSIT_OVERDUE_AFTER_DAYS,
  LOOKBACK_DAYS,
  PAYMENT_LEAD_DAYS,
  buildDigestGroups,
  daysSince,
  depositOwedSince,
  depositsAwaitingReturn,
} from "./outstanding";
import {
  sendDepositOverdueReminder,
  sendPaymentBeforePickupReminder,
  sendPickupTodayReminder,
  sendRentalActionDigest,
} from "./reminder-emails";

export { buildDigestGroups } from "./outstanding";

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
