import type { Database } from "@/lib/portal/database.types";

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

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
