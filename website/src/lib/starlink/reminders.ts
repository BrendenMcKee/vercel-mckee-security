import "server-only";
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
 * How far back finished bookings are still chased. Beyond this a stale row
 * would nag forever, which trains people to ignore the email.
 */
const LOOKBACK_DAYS = 120;

const RENTAL_SELECT = "*, unit:units(id,name,color,active)";

type ReminderKind = "pickup_today" | "payment_before_pickup";

export type StarlinkReminderSummary = {
  pickupToday: number;
  paymentBeforePickup: number;
  digestItems: number;
  digestSent: boolean;
  /** Set when the run was a no-op or a part of it could not complete. */
  note?: string;
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
): RentalActionGroup[] {
  const requestCutoff = addDaysIso(today, -REQUEST_REPLY_GRACE_DAYS);

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

  const unpaid = rentals.filter(
    (r) =>
      (r.status === "active" || r.status === "returned") && !isPaidInFull(r) &&
      r.quoted_price != null &&
      r.quoted_price > 0,
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
    (r) => r.status === "requested" && r.created_at.slice(0, 10) <= requestCutoff,
  );

  return [
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
        `${formatCurrency(r.deposit_amount)} held · rental ended ${formatDateMedium(
          r.return_date,
        )}`,
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
 * the email actually goes out, so a failed send is retried tomorrow rather than
 * silently swallowed.
 */
async function runOneShotReminders(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rentals: RentalWithUnit[],
  today: string,
): Promise<{ pickupToday: number; paymentBeforePickup: number }> {
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

  async function deliver(
    rental: RentalWithUnit,
    kind: ReminderKind,
    sentFor: string,
    sendIt: () => Promise<boolean>,
  ): Promise<boolean> {
    if (alreadySent.has(`${rental.id}|${kind}|${sentFor}`)) return false;
    if (!(await sendIt())) return false;

    const { error } = await supabase
      .from("rental_reminders")
      .insert({ rental_id: rental.id, kind, sent_for: sentFor });
    if (error) {
      console.error(`[starlink] ${kind} guard insert failed:`, error.message);
      return false;
    }
    return true;
  }

  let pickupToday = 0;
  for (const rental of rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") &&
      r.pickup_date === today,
  )) {
    if (
      await deliver(rental, "pickup_today", rental.pickup_date, () =>
        sendPickupTodayReminder(rental),
      )
    ) {
      pickupToday += 1;
    }
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
    if (
      await deliver(rental, "payment_before_pickup", rental.pickup_date, () =>
        sendPaymentBeforePickupReminder(rental, daysUntilPickup),
      )
    ) {
      paymentBeforePickup += 1;
    }
  }

  return { pickupToday, paymentBeforePickup };
}

export async function runStarlinkReminderJob(): Promise<StarlinkReminderSummary> {
  const empty: StarlinkReminderSummary = {
    pickupToday: 0,
    paymentBeforePickup: 0,
    digestItems: 0,
    digestSent: false,
  };

  if (!isSupabaseConfigured()) {
    return { ...empty, note: "Supabase is not configured; nothing to check." };
  }

  const supabase = getSupabaseAdmin();
  const today = todayIsoToronto();

  const { data, error } = await supabase
    .from("rentals")
    .select(RENTAL_SELECT)
    .gte("return_date", addDaysIso(today, -LOOKBACK_DAYS));

  if (error) throw new Error(`rentals query failed: ${error.message}`);

  const rentals = (data ?? []) as unknown as RentalWithUnit[];

  // The one-shot reminders need the guard table; the digest does not. Keep the
  // digest working even if the guard lookup fails, since it is the safety net.
  let oneShots = { pickupToday: 0, paymentBeforePickup: 0 };
  let note: string | undefined;
  try {
    oneShots = await runOneShotReminders(supabase, rentals, today);
  } catch (err) {
    note = err instanceof Error ? err.message : String(err);
    console.error("[starlink] one-shot reminders skipped:", err);
  }

  const groups = buildDigestGroups(rentals, today);
  const digestItems = groups.reduce((count, g) => count + g.items.length, 0);
  const digestSent = await sendRentalActionDigest(groups);

  return { ...oneShots, digestItems, digestSent, note };
}
