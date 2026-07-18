import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, isStripeConfigured, tierForPriceId } from "@/lib/portal/stripe";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { sendCardPaymentFailedAlert, sendPaymentSuccessEmail } from "@/lib/portal/emails";
import { planMonthlyCents } from "@/lib/portal/billing";
import { isPerLineService } from "@/lib/portal/service-labels";

/**
 * Stripe webhook (PORTAL_PLAN.md 9.1). Signature-verified with the raw body;
 * every event is recorded in billing_events FIRST (PK = Stripe event id), so
 * replays are ON CONFLICT no-ops and the Billing tab has a full audit feed.
 * All writes use the service role: this route has no user session.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = await getStripeClient().webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (error) {
    console.warn("[portal] Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = getPortalAdminClient();

  const { serviceId, profileId } = extractIds(event);
  const { error: insertError, data: inserted } = await admin
    .from("billing_events")
    .upsert(
      {
        id: event.id,
        type: event.type,
        service_id: serviceId,
        profile_id: profileId,
        payload: JSON.parse(JSON.stringify(event.data.object)),
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertError) {
    console.error("[portal] billing_events insert failed:", insertError);
    // Let Stripe retry; nothing was processed.
    return NextResponse.json({ error: "Event store failed" }, { status: 500 });
  }
  if (!inserted || inserted.length === 0) {
    // Duplicate delivery already handled.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[portal] Stripe webhook handler failed for ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function extractIds(event: Stripe.Event): { serviceId: string | null; profileId: string | null } {
  const object = event.data.object as {
    metadata?: Record<string, string> | null;
    parent?: { subscription_details?: { metadata?: Record<string, string> | null } | null } | null;
  };
  // Invoices carry the subscription's metadata under parent.subscription_details;
  // stamping the ids here lets the client-side payment history (RLS on
  // profile_id + type='invoice.paid') see the row without any backfill.
  const metadata = {
    ...(object.parent?.subscription_details?.metadata ?? {}),
    ...(object.metadata ?? {}),
  };
  return {
    serviceId: metadata.service_id ?? null,
    profileId: metadata.profile_id ?? null,
  };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const serviceId = session.metadata?.service_id;
  const profileId = session.metadata?.profile_id;
  if (!serviceId) {
    console.warn("[portal] checkout.session.completed without service_id metadata:", session.id);
    return;
  }

  const admin = getPortalAdminClient();
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  // Read the renewal date straight from the subscription instead of waiting
  // for invoice.paid: Stripe does not guarantee event order, and the first
  // invoice.paid may arrive before this handler stores the subscription id.
  let nextDueOn: string | null = null;
  if (subscriptionId) {
    try {
      const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
      nextDueOn = subscriptionPeriodEnd(subscription);
    } catch (error) {
      console.error("[portal] checkout.session.completed subscription lookup failed:", error);
    }
  }

  const { error } = await admin
    .from("services")
    .update({
      status: "active",
      billing_method: "stripe",
      stripe_subscription_id: subscriptionId ?? null,
      next_due_on: nextDueOn,
      due_alerted_at: null,
    })
    .eq("id", serviceId);
  if (error) throw error;

  if (profileId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, email")
      .eq("id", profileId)
      .maybeSingle();
    const { data: service } = await admin
      .from("services")
      .select("service_type, tier")
      .eq("id", serviceId)
      .maybeSingle();
    if (profile?.email && service) {
      await sendPaymentSuccessEmail({
        to: profile.email,
        firstName: profile.first_name,
        serviceType: service.service_type,
        tier: service.tier,
      });
    }
  }
}

/** Subscription current period end (renewal date) as YYYY-MM-DD. */
function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString().slice(0, 10) : null;
}

/**
 * invoice.paid: the renewal (or first charge) went through. Stamp the next
 * payment date on the service so both dashboards can show "next payment",
 * and activate a service that was waiting on its first payment. The
 * billing_events row doubles as the client-visible payment history.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return;

  const admin = getPortalAdminClient();
  let { data: service } = await admin
    .from("services")
    .select("id, status, profile_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  // Stripe does not guarantee event order: the first invoice.paid can land
  // before checkout.session.completed stores the subscription id. Fall back
  // to the subscription metadata (stamped at checkout) and store the id here.
  if (!service) {
    const metaServiceId = invoice.parent?.subscription_details?.metadata?.service_id;
    if (!metaServiceId) return;
    const { data: byMeta } = await admin
      .from("services")
      .select("id, status, profile_id")
      .eq("id", metaServiceId)
      .maybeSingle();
    if (!byMeta) return;
    service = byMeta;
    await admin
      .from("services")
      .update({ stripe_subscription_id: subscriptionId, billing_method: "stripe" })
      .eq("id", service.id);
  }

  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  const { error } = await admin
    .from("services")
    .update({
      next_due_on: subscriptionPeriodEnd(subscription),
      due_alerted_at: null,
      ...(service.status === "unpaid" ? { status: "active" as const } : {}),
    })
    .eq("id", service.id);
  if (error) throw error;
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const admin = getPortalAdminClient();

  const { data: service } = await admin
    .from("services")
    .select("id, status, tier, service_type, line_count, next_due_on")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (!service) return;

  const updates: {
    status?: "active" | "unpaid" | "cancelled";
    tier?: string;
    next_due_on?: string | null;
    line_count?: number;
    monthly_amount_cents?: number;
  } = {};

  // Keep "next payment" current (renewal = current period end).
  const periodEnd = subscriptionPeriodEnd(subscription);
  if (periodEnd && periodEnd !== service.next_due_on) {
    updates.next_due_on = periodEnd;
  }

  // Status sync: Stripe is the source of truth for autopay services.
  if (subscription.status === "active" && service.status !== "active") {
    updates.status = "active";
  } else if ((subscription.status === "past_due" || subscription.status === "unpaid") && service.status === "active") {
    updates.status = "unpaid";
  } else if (subscription.status === "canceled" && service.status !== "cancelled") {
    updates.status = "cancelled";
  }

  // Tier sync when the plan was changed in Stripe (admin plan changes flow
  // through here too, keeping the DB consistent no matter where the change
  // originated).
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const mapped = tierForPriceId(priceId);
    if (mapped && mapped.serviceType === service.service_type && mapped.tier !== service.tier) {
      updates.tier = mapped.tier;
    }
  }

  // Line-count sync for per-line plans (all VoIP plans, R42): the Stripe
  // subscription quantity is what actually gets charged, so it drives the
  // stored line_count and the display amount.
  const quantity = subscription.items.data[0]?.quantity;
  const effectiveTier = updates.tier ?? service.tier;
  if (
    typeof quantity === "number" &&
    quantity >= 1 &&
    isPerLineService(service.service_type, effectiveTier) &&
    quantity !== service.line_count
  ) {
    updates.line_count = quantity;
    const planRate = planMonthlyCents(service.service_type, effectiveTier);
    if (planRate != null) updates.monthly_amount_cents = planRate * quantity;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("services").update(updates).eq("id", service.id);
    if (error) throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const admin = getPortalAdminClient();
  const { error } = await admin
    .from("services")
    .update({ status: "cancelled", stripe_subscription_id: null })
    .eq("stripe_subscription_id", subscription.id);
  if (error) throw error;
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const admin = getPortalAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  await sendCardPaymentFailedAlert({
    clientName: profile ? `${profile.first_name} ${profile.last_name}` : `Stripe customer ${customerId}`,
    clientEmail: profile?.email ?? null,
    serviceType: null,
    amountCents: invoice.amount_due ?? null,
    profileId: profile?.id ?? null,
  });
}
