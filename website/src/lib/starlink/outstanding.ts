/**
 * Outstanding Starlink work, shared by the daily reminder email and the Alerts
 * tab. Derived from live booking state: tick Deposit returned or assign a kit
 * and the item disappears on the next render. Nothing is stored to "resolve".
 */

import { balanceDue, isPaidInFull } from "./billing";
import {
  addDaysIso,
  daysBetweenInclusive,
  isoDateInToronto,
} from "./dates";
import {
  formatCurrency,
  formatDateMedium,
  formatDateShort,
  formatRelative,
} from "./format";
import type { RentalWithUnit } from "./types";

/** How loudly a group asks to be dealt with. Drives email bands and the tab. */
export type ActionPriority = "urgent" | "today" | "soon";

export type RentalActionItem = {
  rentalId: string;
  customerName: string;
  detail: string;
  /** Per-booking urgency, e.g. "3 days overdue". Not every item has one. */
  flag?: string;
  rental: RentalWithUnit;
};

export type RentalActionGroup = {
  id: string;
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

/** How early an unpaid booking gets chased before its pickup date. */
export const PAYMENT_LEAD_DAYS = 2;

/** Grace given to a website request before it counts as unanswered. */
const REQUEST_REPLY_GRACE_DAYS = 1;

/** How long a finished rental's deposit can sit before the tone changes. */
export const DEPOSIT_OVERDUE_AFTER_DAYS = 1;

/** How far back finished bookings are still chased. Open ones never age out. */
export const LOOKBACK_DAYS = 120;

/** How close a pickup has to be before an unreserved booking becomes urgent. */
const UNIT_URGENT_WITHIN_DAYS = 2;

export const ACTION_PRIORITY_UI: Record<
  ActionPriority,
  { band: string; card: string; bandText: string; flag: string }
> = {
  urgent: {
    band: "Do this first",
    card: "border-red-500/30 bg-red-500/10",
    bandText: "text-red-200",
    flag: "bg-red-500/20 text-red-200",
  },
  today: {
    band: "Do today",
    card: "border-amber-500/30 bg-amber-500/10",
    bandText: "text-amber-200",
    flag: "bg-amber-500/20 text-amber-200",
  },
  soon: {
    band: "When you get a chance",
    card: "border-white/10 bg-surface/60",
    bandText: "text-white/60",
    flag: "bg-white/10 text-white/70",
  },
};

/** "1 day" / "3 days", so no reminder ever says "1 days" or "day(s)". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Whole days elapsed from `iso` up to `today`, floored at zero. */
export function daysSince(iso: string, today: string): number {
  return Math.max(0, daysBetweenInclusive(iso, today) - 1);
}

/**
 * The day a deposit became the customer's to get back. Normally the return
 * date. For a booking cancelled before it ever started that date is in the
 * future, so the cancellation itself starts the clock, which `updated_at`
 * approximates well enough. Never later than today.
 */
export function depositOwedSince(rental: RentalWithUnit, today: string): string {
  const changed = isoDateInToronto(rental.updated_at);
  const earliest =
    changed && changed < rental.return_date ? changed : rental.return_date;
  return earliest > today ? today : earliest;
}

/** Where a booking's pickup sits relative to today, for an at-a-glance chip. */
function pickupProximity(pickupIso: string, today: string): string {
  if (pickupIso === today) return "picks up today";
  if (pickupIso < today) {
    return `pickup was ${plural(daysSince(pickupIso, today), "day")} ago`;
  }
  return `picks up in ${plural(daysSince(today, pickupIso), "day")}`;
}

type GroupSpec = {
  id: string;
  icon: string;
  priority: ActionPriority;
  action: (count: number) => string;
  summary: (count: number) => string;
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
      rental,
      ...(mark ? { flag: mark } : {}),
    };
  });
  return {
    id: spec.id,
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

/** Confirmed and collecting today. Out means they already have the kit. */
export function isConfirmedPickupToday(
  rental: Pick<RentalWithUnit, "status" | "pickup_date">,
  today: string,
): boolean {
  return rental.status === "confirmed" && rental.pickup_date === today;
}

/** Finished bookings where we took a deposit and still have it. */
export function depositsAwaitingReturn(
  rentals: RentalWithUnit[],
): RentalWithUnit[] {
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

type ActionGroupOptions = {
  /** Pickup emails that failed; the digest carries them so they are not lost. */
  failedPickupsToday?: RentalWithUnit[];
  /** Every pickup today, whether or not an email went out (the Alerts tab). */
  includePickupToday?: boolean;
  /** Unpaid confirmed bookings in the two-day lead-up to pickup. */
  includeUpcomingPayments?: boolean;
};

function buildActionGroups(
  rentals: RentalWithUnit[],
  today: string,
  options: ActionGroupOptions = {},
): RentalActionGroup[] {
  const requestCutoff = Date.now() - REQUEST_REPLY_GRACE_DAYS * 86_400_000;
  const paymentWindowEnd = addDaysIso(today, PAYMENT_LEAD_DAYS);

  // Confirmed only. Out means the customer already has it, so "get the kit
  // ready for pickup" is done. Unpaid Out bookings land under Check payment.
  const pickupToday = rentals.filter((r) => isConfirmedPickupToday(r, today));

  const upcomingUnpaid = rentals.filter(
    (r) =>
      r.status === "confirmed" &&
      r.pickup_date > today &&
      r.pickup_date <= paymentWindowEnd &&
      !isPaidInFull(r),
  );

  const overdueReturns = rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") &&
      r.return_date < today,
  );

  const depositsOwed = depositsAwaitingReturn(rentals);
  const depositsOverdue = depositsOwed.filter(
    (r) =>
      daysSince(depositOwedSince(r, today), today) >= DEPOSIT_OVERDUE_AFTER_DAYS,
  );
  const depositsDueNow = depositsOwed.filter(
    (r) =>
      daysSince(depositOwedSince(r, today), today) < DEPOSIT_OVERDUE_AFTER_DAYS,
  );

  const unpaid = rentals.filter(
    (r) =>
      (r.status === "active" ||
        r.status === "returned" ||
        (r.status === "confirmed" && r.pickup_date <= today)) &&
      r.quoted_price != null &&
      r.quoted_price > 0 &&
      !isPaidInFull(r) &&
      // A confirmed pickup today already has its own row; collecting payment
      // is flagged on that card instead of listing the person twice. Once the
      // booking is Out, that row is gone and this group takes over.
      !(options.includePickupToday && isConfirmedPickupToday(r, today)),
  );

  const noPrice = rentals.filter(
    (r) =>
      r.quoted_price === null &&
      (r.status === "active" ||
        r.status === "returned" ||
        (r.status === "confirmed" && r.pickup_date <= paymentWindowEnd)),
  );

  const noUnit = rentals.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "active") && r.unit_id === null,
  );

  const notMarkedOut = rentals.filter(
    (r) =>
      r.status === "confirmed" &&
      r.pickup_date < today &&
      r.return_date >= today,
  );

  const staleRequests = rentals.filter((r) => {
    if (r.status !== "requested") return false;
    // A request that picks up today or in the payment window cannot wait out
    // the usual one-day grace — tomorrow is too late.
    if (r.pickup_date <= paymentWindowEnd) return true;
    const created = Date.parse(r.created_at);
    return Number.isFinite(created) && created <= requestCutoff;
  });

  const noUnitIsUrgent = noUnit.some(
    (r) => r.pickup_date <= addDaysIso(today, UNIT_URGENT_WITHIN_DAYS),
  );

  // Never list a kit that is already Out, even if a stale failed-email list
  // still names it.
  const pickupForDigest = (
    options.includePickupToday
      ? pickupToday
      : (options.failedPickupsToday ?? [])
  ).filter((r) => isConfirmedPickupToday(r, today));
  const pickupInstruction = options.includePickupToday
    ? "Check the kit over and set it aside before the customer arrives. Open the booking to mark it Out once they have it."
    : "The pickup reminder for these could not be delivered, so they are here instead. Check the kit over and set it aside before the customer arrives.";

  return [
    group(
      {
        id: "pickup_today",
        icon: "⚠️",
        priority: "urgent",
        action: (n) => `Get ${plural(n, "kit")} ready for pickup today`,
        summary: (n) => `${plural(n, "pickup")} today`,
        instruction: pickupInstruction,
      },
      pickupForDigest,
      (r) =>
        `Collecting today${r.pickup_time ? ` at ${r.pickup_time}` : ""} · ${unitSuffix(r)}`,
      (r) =>
        options.includePickupToday &&
        r.quoted_price != null &&
        r.quoted_price > 0 &&
        !isPaidInFull(r)
          ? "today · unpaid"
          : "today",
    ),
    group(
      {
        id: "overdue_returns",
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
        id: "deposits_overdue",
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
        id: "deposits_due",
        icon: "💵",
        priority: "today",
        action: (n) => `Send ${plural(n, "deposit")} back`,
        summary: (n) => `${plural(n, "deposit")} to send back`,
        instruction:
          "The rental has just finished, so the deposit is due back. Send it, then tick Deposit returned on the booking — otherwise this starts chasing you tomorrow.",
      },
      depositsDueNow,
      (r) =>
        `${depositAmountLine(r)} · rental ended ${formatDateMedium(r.return_date)}`,
      () => "due today",
    ),
    group(
      {
        id: "no_unit",
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
    options.includeUpcomingPayments
      ? group(
          {
            id: "payment_before_pickup",
            icon: "💳",
            priority: "today",
            action: (n) => `Collect ${plural(n, "payment")} before pickup`,
            summary: (n) => `${plural(n, "payment")} before pickup`,
            instruction:
              "These go out in the next two days and are not marked paid. Confirm the money, then tick Paid in full.",
          },
          upcomingUnpaid,
          (r) =>
            `${formatCurrency(balanceDue(r))} of ${formatCurrency(
              r.quoted_price,
            )} still owed · ${unitSuffix(r)}`,
          (r) => pickupProximity(r.pickup_date, today),
        )
      : null,
    group(
      {
        id: "unpaid",
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
        id: "stale_requests",
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
        id: "no_price",
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
        id: "not_marked_out",
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
 * Bookings that still need something done, most urgent first. The daily digest
 * uses this; pickup-today only appears when that morning's email failed.
 */
export function buildDigestGroups(
  rentals: RentalWithUnit[],
  today: string,
  failedPickupsToday: RentalWithUnit[] = [],
): RentalActionGroup[] {
  return buildActionGroups(rentals, today, { failedPickupsToday });
}

/**
 * Everything that still needs doing right now, including pickups today and
 * unpaid bookings about to go out. The Alerts tab is this list.
 */
export function buildOutstandingGroups(
  rentals: RentalWithUnit[],
  today: string,
): RentalActionGroup[] {
  const cutoff = addDaysIso(today, -LOOKBACK_DAYS);
  const inScope = rentals.filter(
    (r) =>
      r.status === "requested" ||
      r.status === "confirmed" ||
      r.status === "active" ||
      r.return_date >= cutoff,
  );
  return buildActionGroups(inScope, today, {
    includePickupToday: true,
    includeUpcomingPayments: true,
  });
}

/** Unique bookings that still need at least one thing done. */
export function outstandingBookingCount(groups: RentalActionGroup[]): number {
  return new Set(groups.flatMap((g) => g.items.map((item) => item.rentalId)))
    .size;
}
