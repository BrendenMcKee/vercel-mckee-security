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

export type MoneyInput =
  | { ok: true; value: number | null }
  | { ok: false };

/**
 * Parse a typed money field, tolerating the way people actually write amounts
 * ("$300", "1,250.00"). Blank means "not recorded" and is distinct from
 * unparseable, so a typo can never be mistaken for clearing the field.
 */
export function parseMoneyInput(raw: string): MoneyInput {
  const cleaned = raw.replace(/[$\s,]/g, "");
  if (!cleaned) return { ok: true, value: null };
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false };
  // The columns are numeric(10,2); round here so what is stored is what the
  // comparisons in this file were made against.
  return { ok: true, value: Math.round(parsed * 100) / 100 };
}

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

/** Deposit dollars still sitting with us. */
export function depositHeld(rental: DepositFields): number {
  if (!rental.deposit_received || rental.deposit_returned) return 0;
  return rental.deposit_amount ?? 0;
}

/**
 * A refund always sends back the whole deposit, so the amount is derived from
 * the deposit on the booking rather than trusted from the request body. An
 * unknown deposit stays null: "we do not know" is honest, where 0 would be a
 * false claim that nothing was given back.
 */
export function resolveDepositReturnedAmount(
  depositReturned: boolean,
  depositAmount: number | null,
): number | null {
  return depositReturned ? depositAmount : null;
}
