import type { Database } from "@/lib/portal/database.types";
import { tierLabel } from "@/lib/portal/service-labels";

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type BillingInterval = Database["public"]["Enums"]["billing_interval"];

/**
 * Monitoring pricing (stakeholder-confirmed 2026-07-05): per month, PLUS TAX,
 * invoiced ANNUALLY (site disclaimer; 30-day written notice to cancel, pro-rated
 * refund). Amounts are pre-tax monthly cents; an annual invoice is 12x + tax.
 */
export const MONITORING_MONTHLY_CENTS: Record<string, number> = {
  landline: 2495,
  cellular: 3495,
  cellular_tc: 3995,
  cellular_tc_home: 4495,
};

/**
 * VoIP pricing (stakeholder 2026-07-18, R42): per month, PLUS TAX, billed
 * MONTHLY. Interim rates while the tier structure settles (D14). Every VoIP
 * plan is PER LINE, so a service's stored amount is this rate times its
 * line_count. `professional` is displayed as "Business".
 */
export const VOIP_MONTHLY_CENTS: Record<string, number> = {
  residential: 3499,
  professional: 5999,
};

/**
 * The confirmed monthly rate for a plan, or null when the plan has no fixed
 * rate yet (cloud backup ships with Track 2). Per-line plans return the
 * single-line rate; multiply by the service's line_count for the total.
 */
export function planMonthlyCents(serviceType: string, tier: string): number | null {
  if (serviceType === "monitoring") return MONITORING_MONTHLY_CENTS[tier] ?? null;
  if (serviceType === "voip") return VOIP_MONTHLY_CENTS[tier] ?? null;
  return null;
}

/**
 * Plan-picker option label (stakeholder 2026-07-18): the monthly rate first,
 * then a pipe, then the plan name, e.g. "$34.99 | Residential Unlimited
 * Canada-Wide". Rates are pre-tax (HST is understood); plans without a
 * confirmed rate yet (cloud backup until Track 2) fall back to the bare name.
 */
export function tierOptionLabel(serviceType: string, tier: string): string {
  const rate = planMonthlyCents(serviceType, tier);
  return rate == null ? tierLabel(tier) : `${formatCents(rate)} | ${tierLabel(tier)}`;
}

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual (12 months per invoice)",
};

/** Months a paid invoice covers. */
export function intervalMonths(interval: BillingInterval): number {
  return interval === "annual" ? 12 : 1;
}

/**
 * D11 default copy (pending stakeholder confirmation): how legacy-rail
 * clients pay. Used verbatim in the dashboard banner and reminder emails.
 */
export const PAYMENT_INSTRUCTIONS =
  "Send an Interac e-Transfer to info@mckeesecurity.ca with your name in the message, " +
  "or call (705) 457-2156 to arrange payment by cheque or cash.";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  etransfer: "e-Transfer",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Days from today (Toronto-naive date compare) until an ISO date; negative = overdue. */
export function daysUntil(isoDate: string): number {
  const today = new Date();
  const target = new Date(`${isoDate}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}
