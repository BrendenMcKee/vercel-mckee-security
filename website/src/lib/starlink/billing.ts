/**
 * Money semantics for Starlink rentals, shared by the admin UI and the API.
 *
 * The rental price is the one figure anyone types in: it is what the customer
 * is charged. Payment and the deposit are then recorded as facts, not as
 * re-typed amounts, because they are never anything other than the price and
 * the deposit already on the booking. The numeric columns still hold real
 * dollars so revenue and deposit reporting keep working; they are just derived
 * from the yes/no state instead of entered by hand.
 */

/** Standard refundable deposit, pre-filled on a new rental and editable. */
export const DEFAULT_DEPOSIT_AMOUNT = 300;

type BillingFields = {
  quoted_price: number | null;
  amount_received: number | null;
};

type DepositFields = {
  deposit_amount: number | null;
  deposit_received: boolean;
  deposit_returned: boolean;
};

/** True once the customer has paid the full rental price. */
export function isPaidInFull(rental: BillingFields): boolean {
  const price = rental.quoted_price;
  if (price == null || price <= 0) return false;
  return (rental.amount_received ?? 0) >= price;
}

/** Dollars still owed on the rental price, or null when no price is set yet. */
export function balanceDue(rental: BillingFields): number | null {
  if (rental.quoted_price == null) return null;
  return Math.max(rental.quoted_price - (rental.amount_received ?? 0), 0);
}

/**
 * A part-payment recorded against a rental that is not paid in full. Surfaced
 * in the UI so an older figure is visible rather than silently dropped or
 * rounded up to the full price.
 */
export function partialPayment(rental: BillingFields): number | null {
  const received = rental.amount_received;
  if (received == null || received <= 0) return null;
  return isPaidInFull(rental) ? null : received;
}

/** Deposit dollars still sitting with us. */
export function depositHeld(rental: DepositFields): number {
  if (!rental.deposit_received || rental.deposit_returned) return 0;
  return rental.deposit_amount ?? 0;
}

/**
 * A refund always sends back the whole deposit, so the amount is derived from
 * the deposit on the booking rather than trusted from the request body.
 */
export function resolveDepositReturnedAmount(
  depositReturned: boolean,
  depositAmount: number | null,
): number | null {
  return depositReturned ? (depositAmount ?? 0) : null;
}
