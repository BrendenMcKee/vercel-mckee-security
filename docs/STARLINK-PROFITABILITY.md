# Starlink profitability

The Profit tab on `/starlink-admin` answers two questions: is each kit covering
its Starlink subscription, and is the fleet as a whole.

## What counts

| Side | Source |
|------|--------|
| Income | `rentals.amount_received` on confirmed, out, and returned bookings, prorated across the days of the rental that fall in the period |
| Cost | `unit_costs.monthly_cost`, spread across the days of the period (`monthly / days-in-that-month`) |
| Not counted | Deposits (`deposit_amount` / received / returned). They belong to the customer. Requested and cancelled bookings. |

A booking that runs 29 Aug – 7 Sep contributes 3/10 of its rental payment to
August and 7/10 to September. Changing a kit's monthly rate inserts a new
`unit_costs` row from the chosen date; days before that keep the old rate.
A rate dated in the future is shown as upcoming and does not replace the
current plan on the kit card. Cost never starts before the kit's Toronto
creation date, even if someone backdates `effective_from`.

## Rates in force (seeded 2026-08-13)

| Kit | Plan | Monthly |
|-----|------|---------|
| Starlink 1 | Roam - Unlimited | $200 |
| Starlink 2 | Roam - 300GB | $110 |
| Starlink 3 | Roam - Unlimited | $200 |

Edit these on the Profit tab. Use **Effective from** when Starlink changes the
price so last month does not get rewritten.

## Code

| Path | Role |
|------|------|
| `website/src/lib/starlink/profit.ts` | the math |
| `website/src/components/starlink-admin/profit-view.tsx` | the tab |
| `website/src/app/api/starlink-admin/units/[id]/costs/route.ts` | save a rate |
| `supabase/migrations/20260813142103_starlink_unit_costs.sql` | table + seed |
| `website/scripts/profit-check.mjs` | deposits-out, straddling, rate-change assertions |
