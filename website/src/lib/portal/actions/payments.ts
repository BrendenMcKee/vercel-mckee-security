"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type Stripe from "stripe";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin, tryRequireUser } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import {
  findOrCreateStripeCustomer,
  getBillingPortalConfigurationId,
  getStripeClient,
  isStripeConfigured,
  priceForVoipAmount,
  priceIdFor,
  resolveVoipNumberPortPriceId,
  trialEndFor,
} from "@/lib/portal/stripe";
import { activateRemainingAutopay, chargePortFeeOffSession } from "@/lib/portal/activate-autopay";
import { sendManualPaymentRecorded } from "@/lib/portal/emails";
import {
  intervalMonths,
  serviceMonthlyCents,
  voipInvoiceDescription,
  voipPortFeeCents,
  voipUnchargedPorts,
} from "@/lib/portal/billing";
import { isVoipService } from "@/lib/portal/service-labels";
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
      "id, profile_id, service_type, tier, status, billing_method, number_count, seat_count, stripe_subscription_id, next_due_on",
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

  let priceId: string | null = null;
  if (isVoipService(service.service_type)) {
    const amount = serviceMonthlyCents({
      serviceType: "voip",
      tier: service.tier,
      numberCount: service.number_count,
      seatCount: service.seat_count,
    });
    if (amount == null || amount <= 0) {
      return { ok: false, error: "This plan is not available for online payment yet. Please contact McKee Security." };
    }
    try {
      priceId = await priceForVoipAmount({
        tier: service.tier,
        amountCents: amount,
        numberCount: service.number_count,
        seatCount: service.seat_count,
      });
    } catch (error) {
      console.error("[portal] VoIP price lookup failed:", error);
      return { ok: false, error: "Could not start checkout. Please try again or contact McKee Security." };
    }
  } else {
    priceId = priceIdFor(service.service_type, service.tier);
  }
  if (!priceId) {
    return { ok: false, error: "This plan is not available for online payment yet. Please contact McKee Security." };
  }

  const trialEnd = service.status === "active" ? trialEndFor(service.next_due_on) : undefined;

  try {
    const stripe = getStripeClient();
    const admin = getPortalAdminClient();

    // One portal client, one Stripe customer. Reuse the stored id or an
    // existing Stripe customer with this email (same person after a delete).
    const customerId = await findOrCreateStripeCustomer({
      existingCustomerId: profile.stripe_customer_id,
      profileId: profile.id,
      email: user.email ?? profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
    });
    if (customerId !== profile.stripe_customer_id) {
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
      payment_method_collection: "always",
      // One subscription, one line, quantity 1. VoIP add-ons are in the price.
      // Other approved services and any port fee start on this same card
      // after checkout.session.completed (activateRemainingAutopay).
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
        ...(isVoipService(service.service_type)
          ? {
              description: voipInvoiceDescription({
                tier: service.tier,
                numberCount: service.number_count,
                seatCount: service.seat_count,
              }),
            }
          : {}),
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

/** Client pays an outstanding VoIP port fee on the card already on file. */
export async function payOwnVoipPortFeeAction(input: {
  serviceId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { profile } = auth;

  if (!z.uuid().safeParse(input.serviceId).success) {
    return { ok: false, error: "Invalid service." };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: "Online payment is not available yet. Please contact McKee Security to pay." };
  }

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, profile_id, service_type, status, billing_method, port_count, port_fee_charged_count")
    .eq("id", input.serviceId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };
  if (!isVoipService(service.service_type) || service.billing_method !== "stripe") {
    return { ok: false, error: "This port fee is not set up for card payment." };
  }
  if (service.status === "paused" || service.status === "cancelled") {
    return { ok: false, error: "This service is not accepting payments right now." };
  }
  const uncharged = voipUnchargedPorts(service.port_count, service.port_fee_charged_count);
  if (uncharged < 1) {
    return { ok: false, error: "There is no outstanding port fee on this service." };
  }
  if (!profile.stripe_customer_id) {
    return { ok: false, error: "Add a card on one of your services first. The port fee will be charged on that card." };
  }

  const stripe = getStripeClient();
  const methods = await stripe.paymentMethods.list({
    customer: profile.stripe_customer_id,
    type: "card",
  });
  const paymentMethodId = methods.data[0]?.id;
  if (!paymentMethodId) {
    return { ok: false, error: "Add a card on one of your services first. The port fee will be charged on that card." };
  }

  try {
    const result = await chargePortFeeOffSession({
      serviceId: service.id,
      profileId: profile.id,
      customerId: profile.stripe_customer_id,
      paymentMethodId,
      uncharged,
      alreadyCharged: service.port_fee_charged_count,
    });
    if (!result.ok) return result;
  } catch (error) {
    console.error("[portal] payOwnVoipPortFee failed:", error);
    return { ok: false, error: "The card could not be charged. Try again or contact McKee Security." };
  }

  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

/** Card already on file: start any leftover approved services and port fees. */
export async function confirmRemainingAutopayAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await tryRequireUser();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  if (!isStripeConfigured()) {
    return { ok: false, error: "Online payment is not available yet. Please contact McKee Security to pay." };
  }
  if (!auth.profile.stripe_customer_id) {
    return { ok: false, error: "Add your card first, then these payments can start." };
  }
  try {
    await activateRemainingAutopay({ profileId: auth.profile.id });
  } catch (error) {
    console.error("[portal] confirmRemainingAutopay failed:", error);
    return { ok: false, error: "Could not start the remaining payments. Try again or contact McKee Security." };
  }
  revalidatePath("/user-dashboard");
  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
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
    .select("id, service_type, tier, billing_method, number_count, seat_count, stripe_subscription_id, next_due_on")
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

  // On autopay the charge is the derived plan total (VoIP: one figure from
  // the rate card). Hand-entered rates apply to the manual rail alone.
  // VoIP is always monthly (R50): an annual interval would make reminders
  // quote 12x while Stripe still charges the monthly price.
  const planRate = serviceMonthlyCents({
    serviceType: service.service_type,
    tier: service.tier,
    numberCount: service.number_count,
    seatCount: service.seat_count,
  });
  const amountCents =
    billingMethod === "stripe" && planRate != null ? planRate : monthlyAmountCents;
  const interval = isVoipService(service.service_type) ? "monthly" : billingInterval;

  const { error } = await supabase
    .from("services")
    .update({
      billing_method: billingMethod,
      billing_interval: interval,
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

/**
 * One-time number-port fee (R50). Never advances the monthly cycle and never
 * lands on the recurring subscription. Stripe: a one-time invoice. Manual:
 * a ledger row with a port-fee note.
 */
export async function chargeVoipPortFee(input: {
  serviceId: string;
  method?: "etransfer" | "cheque" | "cash" | "other";
  paidOn?: string;
}): Promise<RecordPaymentResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

  if (!z.uuid().safeParse(input.serviceId).success) {
    return { ok: false, error: "Invalid service." };
  }

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select(
      "id, profile_id, service_type, status, port_count, port_fee_charged_count, billing_method, profiles(first_name, email, stripe_customer_id)",
    )
    .eq("id", input.serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };
  if (!isVoipService(service.service_type)) {
    return { ok: false, error: "Port fees apply to VoIP only." };
  }
  if (service.status === "paused" || service.status === "cancelled") {
    return {
      ok: false,
      error:
        service.status === "paused"
          ? "Restart this service before charging the port fee. Pause holds all card charges."
          : "This service is cancelled. Record the port fee on the manual rail if it is still owed.",
    };
  }
  const uncharged = voipUnchargedPorts(service.port_count, service.port_fee_charged_count);
  if (uncharged < 1) {
    return {
      ok: false,
      error:
        service.port_count < 1
          ? "This service has no numbers marked for porting."
          : "The port fee for those numbers is already recorded. Raise the port count if more numbers are being ported.",
    };
  }

  const amountCents = voipPortFeeCents(uncharged);
  const paidOn = input.paidOn ?? new Date().toISOString().slice(0, 10);
  const note = `Number port fee: ${uncharged} number${uncharged === 1 ? "" : "s"}`;
  const nextChargedCount = service.port_fee_charged_count + uncharged;

  // Reserve the count first so a double click cannot open two invoices.
  const reserved = await markPortFeeCharged(
    supabase,
    service.id,
    service.port_fee_charged_count,
    nextChargedCount,
  );
  if (!reserved) {
    return {
      ok: false,
      error: "The port fee for those numbers is already recorded. Refresh if you just charged it.",
    };
  }

  if (service.billing_method === "stripe") {
    if (!isStripeConfigured()) {
      await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
      return {
        ok: false,
        error: "This service is on card payments but Stripe is not configured. Record the port fee on the manual rail, or configure Stripe first.",
      };
    }
    const client = service.profiles;
    const customerId = client?.stripe_customer_id;
    if (!customerId) {
      await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
      return {
        ok: false,
        error: "Port fee needs a Stripe customer. Record it on the manual rail, or finish card setup first.",
      };
    }
    let portPrice: string;
    try {
      portPrice = await resolveVoipNumberPortPriceId();
    } catch (error) {
      console.error("[portal] VoIP port-fee price lookup failed:", error);
      await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
      return {
        ok: false,
        error: "Could not find the Number Port Fee in Stripe. Try again or record it on the manual rail.",
      };
    }
    try {
      const stripe = getStripeClient();
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "charge_automatically",
        auto_advance: false,
        metadata: {
          service_id: service.id,
          profile_id: service.profile_id,
          kind: "voip_port_fee",
        },
        ...(process.env.STRIPE_TAX_RATE_ID
          ? { default_tax_rates: [process.env.STRIPE_TAX_RATE_ID] }
          : {}),
      });
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        pricing: { price: portPrice },
        quantity: uncharged,
        description: note,
      });
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      const paid =
        finalized.status === "paid"
          ? finalized
          : finalized.status === "open"
            ? await stripe.invoices.pay(finalized.id)
            : finalized;
      if (paid.status !== "paid") {
        await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
        await stripe.invoices.voidInvoice(invoice.id).catch((error) => {
          console.error("[portal] port-fee invoice void failed:", error);
        });
        return {
          ok: false,
          error: "The card was not charged. Finish card setup or record the port fee on the manual rail.",
        };
      }
    } catch (error) {
      console.error("[portal] chargeVoipPortFee Stripe failed:", error);
      await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
      return { ok: false, error: "Stripe could not charge the port fee. Try again or record it as a received payment." };
    }
    revalidatePath("/admin-dashboard", "layout");
    revalidatePath("/user-dashboard");
    return { ok: true, nextDueOn: null, emailSent: null };
  }

  const { error: ledgerError } = await supabase.from("manual_payments").insert({
    service_id: service.id,
    profile_id: service.profile_id,
    amount_cents: amountCents,
    method: input.method ?? "other",
    paid_on: paidOn,
    note,
    recorded_by: user.id,
    recorded_by_email: user.email,
  });
  if (ledgerError) {
    console.error("[portal] port-fee ledger insert failed:", ledgerError);
    await markPortFeeCharged(supabase, service.id, nextChargedCount, service.port_fee_charged_count);
    return { ok: false, error: "Could not record the port fee. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard");
  return { ok: true, nextDueOn: null, emailSent: null };
}

async function markPortFeeCharged(
  supabase: Awaited<ReturnType<typeof createPortalServerClient>>,
  serviceId: string,
  expectedCharged: number,
  nextCharged: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("services")
    .update({ port_fee_charged_count: nextCharged })
    .eq("id", serviceId)
    .eq("port_fee_charged_count", expectedCharged)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[portal] port_fee_charged_count update failed:", error);
    return false;
  }
  return Boolean(data);
}
