-- Backfill for the simplified rental billing model.
--
-- The old form had three price boxes (daily rate, quoted price, amount
-- received) and no guidance about which one mattered, so some bookings were
-- filled in with only the amount received: the money is recorded but the
-- booking looks like it has no price. Billing is now one price plus a paid
-- yes/no, where paid means "the price came in", so those rows need the price
-- they were actually charged.
--
-- Only rows with no price at all are touched, so a genuine part payment
-- against a known price is left exactly as it is.

update public.rentals
set quoted_price = amount_received
where quoted_price is null
  and amount_received is not null
  and amount_received > 0;

-- A returned deposit always sends back the whole deposit; make any older row
-- agree with what the API now derives.
update public.rentals
set deposit_returned_amount = deposit_amount
where deposit_returned
  and deposit_returned_amount is distinct from deposit_amount;

-- A deposit that was never received cannot have been returned.
update public.rentals
set deposit_returned = false,
    deposit_returned_at = null,
    deposit_returned_amount = null
where deposit_returned
  and not deposit_received;
