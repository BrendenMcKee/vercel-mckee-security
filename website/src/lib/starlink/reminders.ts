import "server-only";
import { recordPortalAlert } from "@/lib/portal/alerts";
import { balanceDue, isPaidInFull } from "@/lib/starlink/billing";
import {
  addDaysIso,
  daysBetweenInclusive,
  todayIsoToronto,
} from "@/lib/starlink/dates";
import {
  formatCurrency,
  formatDateMedium,
  formatRelative,
} from "@/lib/starlink/format";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/starlink/supabase-admin";
import type { RentalWithUnit } from "@/lib/starlink/types";
import {
  sendPaymentBeforePickupReminder,
  sendPickupTodayReminder,
  sendRentalActionDigest,
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

type ReminderKind = "pickup_today" | "payment_before_pickup";

export type StarlinkReminderSummary = {
  pickupToday: number;
  paymentBeforePickup: number;
  digestItems: number;
  /** Distinguishes "nothing needed doing" from "we could not tell anyone". */
  digestStatus: "sent" | "nothing-to-send" | "failed";
  /** Anything that stopped part of the run from completing. */
  notes?: string[];
};

function itemsOf(rentals: RentalWithUnit[], detail: (r: RentalWithUnit) => string) {
  return rentals.map<RentalActionItem>((rental) => ({
    rentalId: rental.id,
    customerName: rental.customer_name,
    detail: detail(rental),
  }));
}

function group(
  label: string,
  instruction: string,
  rentals: RentalWithUnit[],
  detail: (r: RentalWithUnit) => string,
): RentalActionGroup | null {
  if (rentals.length === 0) return null;
  return { label, instruction, items: itemsOf(rentals, detail) };
}

function unitSuffix(rental: RentalWithUnit): string {
  return rental.unit ? rental.unit.name : "no unit assigned";
}

/** Bookings that still need something done to them, most urgent first. */
function buildDigestGroups(
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

  const depositsToRefund = rentals.filter(
    (r) =>
      r.deposit_received &&
      !r.deposit_returned &&
      (r.status === "returned" || r.status === "cancelled"),
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

  return [
    group(
      "Pickup today, reminder failed to send",
      "The dedicated pickup reminder could not be delivered for these, so they are listed here instead.",
      failedPickupsToday,
      (r) =>
        `Collecting today${r.pickup_time ? ` at ${r.pickup_time}` : ""} · ${unitSuffix(r)}`,
    ),
    group(
      "Kit is late back",
      "The return date has passed and these are still booked out. Mark them Returned once the kit is in, or push the return date if the customer is keeping it longer.",
      overdueReturns,
      (r) =>
        `Due back ${formatDateMedium(r.return_date)}, ${
          daysBetweenInclusive(r.return_date, today) - 1
        } day(s) ago · ${unitSuffix(r)}`,
    ),
    group(
      "Deposit still to go back",
      "The rental is finished but we are still holding the deposit. Send it back, then tick Deposit returned on the booking.",
      depositsToRefund,
      (r) =>
        `${
          r.deposit_amount === null
            ? "Amount not recorded"
            : `${formatCurrency(r.deposit_amount)} held`
        } · rental ended ${formatDateMedium(r.return_date)}`,
    ),
    group(
      "Payment never recorded",
      "The kit went out but the booking is not marked paid. Check whether the money came in, then tick Paid in full.",
      unpaid,
      (r) =>
        `${formatCurrency(balanceDue(r))} of ${formatCurrency(
          r.quoted_price,
        )} outstanding · picked up ${formatDateMedium(r.pickup_date)}`,
    ),
    group(
      "No price on the booking",
      "These have no rental price recorded, so nothing will ever show as owed. Add the price you quoted.",
      noPrice,
      (r) =>
        `${formatDateMedium(r.pickup_date)} to ${formatDateMedium(
          r.return_date,
        )} · ${unitSuffix(r)}`,
    ),
    group(
      "No unit assigned",
      "These dates are not reserved against a kit yet, so they can still be double-booked. Assign a unit.",
      noUnit,
      (r) =>
        `${formatDateMedium(r.pickup_date)} to ${formatDateMedium(
          r.return_date,
        )} · marked ${r.status}`,
    ),
    group(
      "Not marked as picked up",
      "Pickup day has passed but these are still only Confirmed. Set them to Out if the customer has the kit.",
      notMarkedOut,
      (r) => `Pickup was ${formatDateMedium(r.pickup_date)} · ${unitSuffix(r)}`,
    ),
    group(
      "Request waiting on a reply",
      "These came in from the website and have not been quoted yet. Send pricing, then confirm or cancel the request.",
      staleRequests,
      (r) =>
        `Wants ${formatDateMedium(r.pickup_date)} to ${formatDateMedium(
          r.return_date,
        )} · asked ${formatRelative(r.created_at)}`,
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

  return { pickupToday, paymentBeforePickup, failedPickupsToday };
}

export async function runStarlinkReminderJob(): Promise<StarlinkReminderSummary> {
  if (!isSupabaseConfigured()) {
    return {
      pickupToday: 0,
      paymentBeforePickup: 0,
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
    digestItems,
    digestStatus,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
