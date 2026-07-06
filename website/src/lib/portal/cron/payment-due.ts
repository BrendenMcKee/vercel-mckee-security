import "server-only";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { intervalMonths, PAYMENT_INSTRUCTIONS } from "@/lib/portal/billing";
import {
  sendCollectionsDigest,
  sendManualPaymentReminder,
  type CollectionsDigestRow,
} from "@/lib/portal/emails";

/** D11 default: first reminder 7 days before due (revisable on stakeholder answer). */
export const REMINDER_WINDOW_DAYS = 7;

export type PaymentDueSummary = {
  candidates: number;
  reminded: number;
  digestSent: boolean;
};

/**
 * R22 daily job (PORTAL_PLAN.md 9.4): every manual service due within the
 * reminder window or overdue gets ONE client reminder per cycle (the
 * due_alerted_at guard; recording a payment clears it), and the admin inbox
 * gets a collections digest listing everyone due or overdue.
 */
export async function runPaymentDueJob(): Promise<PaymentDueSummary> {
  const admin = getPortalAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const windowEnd = new Date(Date.now() + REMINDER_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data: services, error } = await admin
    .from("services")
    .select(
      "id, service_type, status, billing_interval, monthly_amount_cents, next_due_on, due_alerted_at, profiles(id, first_name, last_name, email)",
    )
    .eq("billing_method", "manual")
    .in("status", ["active", "unpaid"])
    .not("next_due_on", "is", null)
    .lte("next_due_on", windowEnd);

  if (error) throw new Error(`payment-due query failed: ${error.message}`);

  const rows = services ?? [];
  let reminded = 0;
  const digest: CollectionsDigestRow[] = [];

  for (const service of rows) {
    const profile = service.profiles;
    if (!profile || !service.next_due_on) continue;
    const overdue = service.next_due_on < today;
    const invoiceCents =
      service.monthly_amount_cents != null
        ? service.monthly_amount_cents * intervalMonths(service.billing_interval)
        : null;

    digest.push({
      clientName: `${profile.first_name} ${profile.last_name}`,
      clientEmail: profile.email,
      serviceType: service.service_type,
      amountCents: invoiceCents,
      dueOn: service.next_due_on,
      overdue,
    });

    // One reminder per cycle (R14-style guard). No email address = digest only.
    if (service.due_alerted_at || !profile.email || invoiceCents == null) continue;

    const sent = await sendManualPaymentReminder({
      to: profile.email,
      firstName: profile.first_name,
      serviceType: service.service_type,
      amountCents: invoiceCents,
      dueOn: service.next_due_on,
      overdue,
      paymentInstructions: PAYMENT_INSTRUCTIONS,
    });

    if (sent) {
      const { error: stampError } = await admin
        .from("services")
        .update({ due_alerted_at: new Date().toISOString() })
        .eq("id", service.id);
      if (stampError) {
        console.error("[portal] due_alerted_at stamp failed:", stampError);
      } else {
        reminded += 1;
      }
    }
  }

  const digestSent = digest.length > 0 ? await sendCollectionsDigest(digest) : false;

  return { candidates: rows.length, reminded, digestSent };
}
