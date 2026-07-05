"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { getStripeClient, isStripeConfigured, priceIdFor } from "@/lib/portal/stripe";
import { sendManualPaymentRecorded } from "@/lib/portal/emails";
import { intervalMonths } from "@/lib/portal/billing";
import { siteConfig } from "@/lib/site-config";

// ---------------------------------------------------------------------------
// Client checkout (PORTAL_PLAN.md 9.1): the ONLY client-initiated money action
// anywhere in the portal (R21). Tier is read from the database, never from
// the client (anti-spoofing, handover 9.3).
// ---------------------------------------------------------------------------

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteConfig.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createCheckoutSession(input: { serviceId: string }): Promise<CheckoutResult> {
  const { user, profile } = await requireUser();

  if (!z.uuid().safeParse(input.serviceId).success) {
    return { ok: false, error: "Invalid service." };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: "Online payment is not available yet. Please contact McKee Security to pay." };
  }

  // Ownership + tier come from the database under RLS: a client can only ever
  // resolve their own service row.
  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, profile_id, service_type, tier, status, billing_method, stripe_subscription_id")
    .eq("id", input.serviceId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };
  if (service.billing_method !== "stripe") {
    return { ok: false, error: "This service is billed manually. See the payment instructions on your dashboard." };
  }
  if (service.status !== "unpaid") {
    return { ok: false, error: "This service does not need a payment right now." };
  }
  if (service.stripe_subscription_id) {
    return { ok: false, error: "This service already has an active subscription. Contact McKee if something looks wrong." };
  }

  const priceId = priceIdFor(service.service_type, service.tier);
  if (!priceId) {
    return { ok: false, error: "This plan is not available for online payment yet. Please contact McKee Security." };
  }

  try {
    const stripe = getStripeClient();
    const admin = getPortalAdminClient();

    // Create/reuse the Stripe customer; persisted via service role because
    // clients have no UPDATE policy on profiles.
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: `${profile.first_name} ${profile.last_name}`,
        metadata: { profile_id: profile.id },
      });
      customerId = customer.id;
      const { error: saveError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.id);
      if (saveError) console.error("[portal] stripe_customer_id save failed:", saveError);
    }

    const origin = await getOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/user-dashboard?payment=success`,
      cancel_url: `${origin}/user-dashboard?payment=cancelled`,
      metadata: {
        profile_id: profile.id,
        service_id: service.id,
        service_type: service.service_type,
        tier: service.tier,
      },
      subscription_data: {
        metadata: { profile_id: profile.id, service_id: service.id },
        // Pricing is advertised pre-tax ("plus tax"); a fixed HST tax rate is
        // applied when configured (STRIPE_TAX_RATE_ID, e.g. 13% Ontario HST).
        ...(process.env.STRIPE_TAX_RATE_ID
          ? { default_tax_rates: [process.env.STRIPE_TAX_RATE_ID] }
          : {}),
      },
    });

    if (!session.url) return { ok: false, error: "Stripe did not return a checkout link. Please try again." };
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[portal] createCheckoutSession failed:", error);
    return { ok: false, error: "Could not start checkout. Please try again or contact McKee Security." };
  }
}

// ---------------------------------------------------------------------------
// Manual rail (R22, 7.3): admin records received payments; the ledger is
// append-only and the service's due date advances one cycle.
// ---------------------------------------------------------------------------

const recordPaymentSchema = z.object({
  serviceId: z.uuid(),
  amountCents: z.number().int().positive("Amount must be positive.").max(10_000_00, "Amount looks too large."),
  method: z.enum(["etransfer", "cheque", "cash", "other"]),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  note: z.string().trim().max(300).optional(),
});

export type RecordPaymentResult =
  | { ok: true; nextDueOn: string | null; emailSent: boolean | null }
  | { ok: false; error: string };

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  // Clamp overflow (e.g. Jan 31 + 1 month) to the last day of the month.
  if (date.getUTCMonth() !== (((m - 1 + months) % 12) + 12) % 12) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

export async function recordManualPayment(input: {
  serviceId: string;
  amountCents: number;
  method: "etransfer" | "cheque" | "cash" | "other";
  paidOn: string;
  note?: string;
}): Promise<RecordPaymentResult> {
  const { user } = await requireAdmin();

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { serviceId, amountCents, method, paidOn, note } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, profile_id, service_type, status, billing_method, billing_interval, next_due_on, profiles(first_name, email)")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };
  if (service.billing_method !== "manual") {
    return { ok: false, error: "This service is on autopay; Stripe records its payments." };
  }

  const { error: ledgerError } = await supabase.from("manual_payments").insert({
    service_id: service.id,
    profile_id: service.profile_id,
    amount_cents: amountCents,
    method,
    paid_on: paidOn,
    note: note || null,
    recorded_by: user.id,
    recorded_by_email: user.email,
  });
  if (ledgerError) {
    console.error("[portal] manual payment insert failed:", ledgerError);
    return { ok: false, error: "Could not record the payment. Please try again." };
  }

  // Advance the cycle from the scheduled due date (not the paid date), so
  // early/late payments keep the anniversary — one interval (monitoring is
  // invoiced annually per the site terms). Clear the reminder guard and
  // activate an unpaid service.
  const nextDueOn = service.next_due_on
    ? addMonths(service.next_due_on, intervalMonths(service.billing_interval))
    : null;
  const { error: serviceError } = await supabase
    .from("services")
    .update({
      next_due_on: nextDueOn,
      due_alerted_at: null,
      ...(service.status === "unpaid" ? { status: "active" as const } : {}),
    })
    .eq("id", service.id);
  if (serviceError) {
    console.error("[portal] due date advance failed:", serviceError);
    return { ok: false, error: "Payment recorded, but the due date failed to advance. Edit the service to fix it." };
  }

  let emailSent: boolean | null = null;
  const client = service.profiles;
  if (client?.email) {
    emailSent = await sendManualPaymentRecorded({
      to: client.email,
      firstName: client.first_name,
      serviceType: service.service_type,
      amountCents,
      paidOn,
      nextDueOn,
    });
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard");
  return { ok: true, nextDueOn, emailSent };
}

// ---------------------------------------------------------------------------
// Billing configuration (7.3): switch rails, set amount and due date.
// ---------------------------------------------------------------------------

const billingConfigSchema = z.object({
  serviceId: z.uuid(),
  billingMethod: z.enum(["stripe", "manual"]),
  billingInterval: z.enum(["monthly", "annual"]),
  monthlyAmountCents: z.number().int().positive().max(10_000_00).nullable(),
  nextDueOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

export type BillingConfigResult = { ok: true } | { ok: false; error: string };

export async function updateServiceBilling(input: {
  serviceId: string;
  billingMethod: "stripe" | "manual";
  billingInterval: "monthly" | "annual";
  monthlyAmountCents: number | null;
  nextDueOn: string;
}): Promise<BillingConfigResult> {
  await requireAdmin();

  const parsed = billingConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { serviceId, billingMethod, billingInterval, monthlyAmountCents, nextDueOn } = parsed.data;

  if (billingMethod === "manual" && !monthlyAmountCents) {
    return { ok: false, error: "Manual billing needs a monthly amount for reminders and collections." };
  }

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };

  if (billingMethod === "manual" && service.stripe_subscription_id) {
    return { ok: false, error: "Cancel the Stripe subscription before switching this service to manual billing." };
  }

  const { error } = await supabase
    .from("services")
    .update({
      billing_method: billingMethod,
      billing_interval: billingInterval,
      monthly_amount_cents: monthlyAmountCents,
      next_due_on: billingMethod === "manual" ? nextDueOn || null : null,
      due_alerted_at: null,
    })
    .eq("id", serviceId);

  if (error) {
    console.error("[portal] updateServiceBilling failed:", error);
    return { ok: false, error: "Could not save billing settings. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard");
  return { ok: true };
}
