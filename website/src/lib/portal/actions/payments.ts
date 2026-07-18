"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type Stripe from "stripe";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin, tryRequireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import {
  getBillingPortalConfigurationId,
  getStripeClient,
  isStripeConfigured,
  priceIdFor,
} from "@/lib/portal/stripe";
import { sendManualPaymentRecorded } from "@/lib/portal/emails";
import { intervalMonths, planMonthlyCents } from "@/lib/portal/billing";
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

/** Stripe wants trial_end at least 48h out; use it only when clearly future. */
function trialEndFor(nextDueOn: string | null): number | undefined {
  if (!nextDueOn) return undefined;
  const dueMs = new Date(`${nextDueOn}T12:00:00Z`).getTime();
  if (dueMs - Date.now() < 3 * 86_400_000) return undefined;
  return Math.floor(dueMs / 1000);
}

export async function createCheckoutSession(input: { serviceId: string }): Promise<CheckoutResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user, profile } = auth;

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
    .select(
      "id, profile_id, service_type, tier, status, billing_method, line_count, stripe_subscription_id, next_due_on",
    )
    .eq("id", input.serviceId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!service) return { ok: false, error: "Service not found." };
  if (service.billing_method !== "stripe") {
    return { ok: false, error: "This service is billed manually. See the payment instructions on your dashboard." };
  }
  // "unpaid" pays now; "active" is a paid-up client putting a card on file
  // (e.g. switched from manual billing): their subscription starts at the
  // next due date via a trial, so nobody is double-billed.
  if (service.status !== "unpaid" && service.status !== "active") {
    return { ok: false, error: "This service does not need a payment right now." };
  }
  if (service.stripe_subscription_id) {
    return { ok: false, error: "This service already has automatic payments set up. Contact McKee if something looks wrong." };
  }

  const priceId = priceIdFor(service.service_type, service.tier);
  if (!priceId) {
    return { ok: false, error: "This plan is not available for online payment yet. Please contact McKee Security." };
  }

  const trialEnd = service.status === "active" ? trialEndFor(service.next_due_on) : undefined;

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
      // Per-line plans (VoIP professional) charge rate x lines via quantity.
      line_items: [{ price: priceId, quantity: service.line_count ?? 1 }],
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
        // Paid-up clients start billing at their existing anniversary.
        ...(trialEnd ? { trial_end: trialEnd } : {}),
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
// Stripe customer portal: clients view card-payment history and update their
// card themselves. Our configuration disables cancellation and plan changes
// (R21: only McKee changes services).
// ---------------------------------------------------------------------------

export type PortalSessionResult = { ok: true; url: string } | { ok: false; error: string };

export async function createBillingPortalSession(): Promise<PortalSessionResult> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { profile } = auth;

  if (!isStripeConfigured()) {
    return { ok: false, error: "Online billing is not available yet." };
  }
  if (!profile.stripe_customer_id) {
    return { ok: false, error: "No card payments on file yet. Set up automatic payments first." };
  }

  try {
    const stripe = getStripeClient();
    const configuration = await getBillingPortalConfigurationId(stripe);
    const origin = await getOrigin();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/user-dashboard`,
      ...(configuration ? { configuration } : {}),
    });
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[portal] createBillingPortalSession failed:", error);
    return { ok: false, error: "Could not open the billing page. Please try again or contact McKee Security." };
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
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

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
    return { ok: false, error: "This service is on automatic card payments; those record themselves." };
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
  // early/late payments keep the anniversary. One interval (monitoring is
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
// Rail switches keep Stripe in sync (stakeholder 2026-07-06): moving an
// autopay client to manual cancels their card subscription and resumes manual
// invoicing at the date they are already paid through.
// ---------------------------------------------------------------------------

const billingConfigSchema = z.object({
  serviceId: z.uuid(),
  billingMethod: z.enum(["stripe", "manual"]),
  billingInterval: z.enum(["monthly", "annual"]),
  monthlyAmountCents: z.number().int().positive().max(10_000_00).nullable(),
  nextDueOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

export type BillingConfigResult = { ok: true; message?: string } | { ok: false; error: string };

function periodEndDate(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString().slice(0, 10) : null;
}

export async function updateServiceBilling(input: {
  serviceId: string;
  billingMethod: "stripe" | "manual";
  billingInterval: "monthly" | "annual";
  monthlyAmountCents: number | null;
  nextDueOn: string;
}): Promise<BillingConfigResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = billingConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { serviceId, billingMethod, billingInterval, monthlyAmountCents, nextDueOn } = parsed.data;

  if (billingMethod === "manual" && !monthlyAmountCents) {
    return { ok: false, error: "Manual billing needs a monthly amount so reminders and the collections list are right." };
  }

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, tier, billing_method, line_count, stripe_subscription_id, next_due_on")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };

  let message: string | undefined;
  let cancelledSubscription = false;
  let paidThrough: string | null = null;

  // Autopay -> manual with a live subscription: cancel the card subscription
  // so the client is never charged by both rails. They are paid through the
  // current period, so manual invoicing picks up from that date.
  if (billingMethod === "manual" && service.stripe_subscription_id) {
    if (!isStripeConfigured()) {
      return { ok: false, error: "This service has automatic card payments but Stripe is not configured on the server." };
    }
    try {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(service.stripe_subscription_id);
      paidThrough = periodEndDate(subscription);
      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(service.stripe_subscription_id, {
          prorate: false,
        });
      }
      cancelledSubscription = true;
      message = paidThrough
        ? `Automatic card payments stopped. The client is paid through ${paidThrough}; manual invoicing starts from that date.`
        : "Automatic card payments stopped. Set the next due date to when their manual invoicing should start.";
    } catch (error) {
      console.error("[portal] Stripe subscription cancel failed:", error);
      return { ok: false, error: "Stripe could not stop the card subscription, so nothing was changed. Try again or check the Stripe dashboard." };
    }
  }

  if (billingMethod === "stripe" && service.billing_method === "manual") {
    message =
      "Switched to automatic card payments. The client will see a “Set up automatic payments” button on their dashboard to enter their card.";
  }

  const nextDue =
    billingMethod === "manual"
      ? nextDueOn || paidThrough || service.next_due_on
      : // Keep the anniversary: checkout uses it to start billing at the
        // right date, and the webhook maintains it afterwards.
        service.next_due_on;

  // On autopay the charge is the plan's Stripe price, so the stored amount is
  // re-synced to the plan rate, times lines for per-line plans (display/KPIs
  // only); hand-entered rates apply to the manual rail alone.
  const planRate = planMonthlyCents(service.service_type, service.tier);
  const amountCents =
    billingMethod === "stripe" && planRate != null
      ? planRate * (service.line_count ?? 1)
      : monthlyAmountCents;

  const { error } = await supabase
    .from("services")
    .update({
      billing_method: billingMethod,
      billing_interval: billingInterval,
      monthly_amount_cents: amountCents,
      next_due_on: nextDue,
      due_alerted_at: null,
      ...(cancelledSubscription ? { stripe_subscription_id: null } : {}),
    })
    .eq("id", serviceId);

  if (error) {
    console.error("[portal] updateServiceBilling failed:", error);
    return { ok: false, error: "Could not save billing settings. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard");
  return { ok: true, message };
}
