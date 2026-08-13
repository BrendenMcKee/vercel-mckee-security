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
 * VoIP rate card (company knowledge 3.12, R50, 2026-08-13). Charged once per
 * system, never per phone / number / handset. The client document is one line
 * at this total. HST is applied to the sum once, not component by component.
 *
 *   monthly_pre_tax = base + (4.99 × additional_numbers) + (24.99 × additional_seats)
 *
 * Base includes 1 number + 1 user seat. Residential has no seat add-on.
 * Number-port fee is one-time and never on the recurring invoice.
 */
export const VOIP_MONTHLY_CENTS: Record<string, number> = {
  residential: 3499,
  professional: 5999,
};

export const VOIP_ADDITIONAL_NUMBER_CENTS = 499;
export const VOIP_ADDITIONAL_SEAT_CENTS = 2499;
export const VOIP_NUMBER_PORT_FEE_CENTS = 4999;
export const HST_RATE = 0.13;

/** Internal BrightPBX cost. Never shown on a client document. */
export const VOIP_SEAT_COST_CENTS = 595;
/** Unconfirmed until BrightPBX answers; treat as $0.00 with a flag. */
export const VOIP_DID_COST_CENTS = 0;
export const VOIP_DID_COST_CONFIRMED = false;

export type VoipConfig = {
  tier: string;
  numberCount: number;
  seatCount: number;
};

export function additionalNumbers(numberCount: number): number {
  return Math.max(0, numberCount - 1);
}

export function additionalSeats(tier: string, seatCount: number): number {
  if (tier === "residential") return 0;
  return Math.max(0, seatCount - 1);
}

export function normalizeVoipConfig(input: VoipConfig): VoipConfig {
  const numberCount = Math.min(100, Math.max(1, Math.trunc(input.numberCount) || 1));
  const seatCount =
    input.tier === "residential"
      ? 1
      : Math.min(100, Math.max(1, Math.trunc(input.seatCount) || 1));
  return { tier: input.tier, numberCount, seatCount };
}

/** Pre-tax monthly cents for a VoIP system (one line, one figure). */
export function voipMonthlyCents(input: VoipConfig): number {
  const { tier, numberCount, seatCount } = normalizeVoipConfig(input);
  const base = VOIP_MONTHLY_CENTS[tier];
  if (base == null) return 0;
  return (
    base +
    VOIP_ADDITIONAL_NUMBER_CENTS * additionalNumbers(numberCount) +
    VOIP_ADDITIONAL_SEAT_CENTS * additionalSeats(tier, seatCount)
  );
}

export function withHstCents(preTaxCents: number): number {
  return Math.round(preTaxCents * (1 + HST_RATE));
}

export function voipPortFeeCents(portCount: number): number {
  return VOIP_NUMBER_PORT_FEE_CENTS * Math.max(0, Math.trunc(portCount) || 0);
}

/** Ports still waiting for the one-time fee. Never charge this twice. */
export function voipUnchargedPorts(portCount: number, chargedCount: number): number {
  const ports = Math.max(0, Math.trunc(portCount) || 0);
  const charged = Math.max(0, Math.trunc(chargedCount) || 0);
  return Math.max(0, ports - charged);
}

export function normalizeVoipPorts(numberCount: number, portCount: number): number {
  const numbers = Math.min(100, Math.max(1, Math.trunc(numberCount) || 1));
  return Math.min(numbers, Math.max(0, Math.trunc(portCount) || 0));
}

/** Seat cost only until BrightPBX confirms DID pricing. */
export function voipInternalCostCents(input: VoipConfig): number {
  const { seatCount, numberCount } = normalizeVoipConfig(input);
  return VOIP_SEAT_COST_CENTS * seatCount + VOIP_DID_COST_CENTS * numberCount;
}

export function voipCoverageLabel(input: VoipConfig): string {
  const { numberCount, seatCount, tier } = normalizeVoipConfig(input);
  const numbers = `${numberCount} number${numberCount === 1 ? "" : "s"}`;
  if (tier === "residential") return numbers;
  return `${numbers}, ${seatCount} seat${seatCount === 1 ? "" : "s"}`;
}

/** Client-facing invoice / subscription line. One line, names what it covers. */
export function voipInvoiceDescription(input: VoipConfig): string {
  const { tier } = normalizeVoipConfig(input);
  const plan = tier === "professional" ? "Commercial VoIP Service" : "Residential VoIP Service";
  return `${plan}: ${voipCoverageLabel(input)}`;
}

/**
 * The confirmed monthly rate for a plan, or null when the plan has no fixed
 * rate yet (cloud backup ships with Track 2). VoIP returns the base-system
 * rate only; use `voipMonthlyCents` for the billed total.
 */
export function planMonthlyCents(serviceType: string, tier: string): number | null {
  if (serviceType === "monitoring") return MONITORING_MONTHLY_CENTS[tier] ?? null;
  if (serviceType === "voip") return VOIP_MONTHLY_CENTS[tier] ?? null;
  return null;
}

export function serviceMonthlyCents(input: {
  serviceType: string;
  tier: string;
  numberCount?: number;
  seatCount?: number;
}): number | null {
  if (input.serviceType === "voip") {
    return voipMonthlyCents({
      tier: input.tier,
      numberCount: input.numberCount ?? 1,
      seatCount: input.seatCount ?? 1,
    });
  }
  return planMonthlyCents(input.serviceType, input.tier);
}

/**
 * Plan-picker option label: monthly base rate first, then a pipe, then the
 * plan name, e.g. "$34.99 | Residential Unlimited Canada-Wide". VoIP options
 * are the base system (1 number + 1 seat); add-ons are configured beside.
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

/** Pre-tax invoice for one cycle (monthly rate x 1 or x 12). */
export function invoicePreTaxCents(monthlyCents: number, interval: BillingInterval): number {
  return monthlyCents * intervalMonths(interval);
}

/** Exact dollars a manual payer should send: one invoice plus 13% HST. */
export function invoiceSendCents(monthlyCents: number, interval: BillingInterval): number {
  return withHstCents(invoicePreTaxCents(monthlyCents, interval));
}

/** Monitoring is always annual; VoIP is always monthly. Other types stay free. */
export function lockedBillingInterval(serviceType: string): BillingInterval | null {
  if (serviceType === "monitoring") return "annual";
  if (serviceType === "voip") return "monthly";
  return null;
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Calendar add that keeps the anniversary day, clamping 31 Jan + 1 month to 28/29 Feb. */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  if (date.getUTCMonth() !== (((m - 1 + months) % 12) + 12) % 12) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

/** Interac e-Transfer recipient (D11). */
export const ETRANSFER_EMAIL = "dennis@mckeesecurity.ca";
export const PAYMENT_PHONE = "(705) 457-2156";
export const PAYMENT_PHONE_TEL = "+17054572156";

/**
 * D11 default copy: how legacy-rail clients pay. Used in reminder emails.
 * The dashboard renders the same facts as structured rows, not this sentence.
 */
export const PAYMENT_INSTRUCTIONS =
  `Send an Interac e-Transfer for the exact amount shown (includes HST) to ${ETRANSFER_EMAIL} with your name in the message, ` +
  `or call ${PAYMENT_PHONE} to arrange payment by cheque or cash.`;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  etransfer: "e-Transfer",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Days from today (Toronto) until an ISO date; negative = overdue. */
export function daysUntil(isoDate: string): number {
  const today = Date.parse(`${todayIsoDate()}T00:00:00Z`);
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}
