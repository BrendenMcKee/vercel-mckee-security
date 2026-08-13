import "server-only";
import type Stripe from "stripe";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import {
  getStripeClient,
  isStripeConfigured,
  priceForVoipAmount,
  priceIdFor,
  resolveVoipNumberPortPriceId,
  trialEndFor,
} from "@/lib/portal/stripe";
import {
  serviceMonthlyCents,
  voipInvoiceDescription,
  voipUnchargedPorts,
} from "@/lib/portal/billing";
import { isServiceAvailable, isVoipService } from "@/lib/portal/service-labels";

/**
 * After the client adds a card once (first Checkout), start every other
 * approved autopay item on that same card: remaining subscriptions and any
 * uncharged VoIP port fees. Monitoring is annual and VoIP is monthly, so
 * Stripe cannot put them on one Checkout session; this is the follow-through.
 */
export function paymentMethodIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const method = subscription.default_payment_method;
  if (typeof method === "string") return method;
  if (method?.id) return method.id;
  return null;
}

/** Persist the Checkout card on the customer so later services and ports reuse it. */
export async function rememberCardOnCustomer(
  customerId: string,
  preferredPaymentMethodId: string | null,
): Promise<string | null> {
  const stripe = getStripeClient();
  let paymentMethodId = preferredPaymentMethodId;
  if (!paymentMethodId) {
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
    paymentMethodId = methods.data[0]?.id ?? null;
  }
  if (!paymentMethodId) return null;
  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  } catch {
    // Already on the customer.
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  return paymentMethodId;
}

export async function activateRemainingAutopay(input: {
  profileId: string;
  skipServiceId?: string;
  paymentMethodId?: string | null;
}): Promise<void> {
  if (!isStripeConfigured()) return;

  const admin = getPortalAdminClient();
  const stripe = getStripeClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", input.profileId)
    .maybeSingle();
  const customerId = profile?.stripe_customer_id;
  if (!customerId) return;

  const paymentMethodId = await rememberCardOnCustomer(customerId, input.paymentMethodId ?? null);
  if (!paymentMethodId) {
    console.warn("[portal] activateRemainingAutopay: no card on the Stripe customer yet");
    return;
  }

  const { data: services } = await admin
    .from("services")
    .select(
      "id, service_type, tier, status, billing_method, number_count, seat_count, port_count, port_fee_charged_count, stripe_subscription_id, next_due_on",
    )
    .eq("profile_id", input.profileId)
    .eq("billing_method", "stripe");

  for (const service of services ?? []) {
    if (input.skipServiceId && service.id === input.skipServiceId) continue;
    if (service.stripe_subscription_id) continue;
    if (service.status !== "unpaid" && service.status !== "active") continue;
    if (!isServiceAvailable(service.service_type)) continue;

    try {
      let priceId: string | null = null;
      if (isVoipService(service.service_type)) {
        const amount = serviceMonthlyCents({
          serviceType: "voip",
          tier: service.tier,
          numberCount: service.number_count,
          seatCount: service.seat_count,
        });
        if (amount == null || amount <= 0) continue;
        priceId = await priceForVoipAmount({
          tier: service.tier,
          amountCents: amount,
          numberCount: service.number_count,
          seatCount: service.seat_count,
        });
      } else {
        priceId = priceIdFor(service.service_type, service.tier);
      }
      if (!priceId) continue;

      const trialEnd = service.status === "active" ? trialEndFor(service.next_due_on) : undefined;
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        default_payment_method: paymentMethodId,
        items: [{ price: priceId, quantity: 1 }],
        metadata: { profile_id: input.profileId, service_id: service.id },
        ...(isVoipService(service.service_type)
          ? {
              description: voipInvoiceDescription({
                tier: service.tier,
                numberCount: service.number_count,
                seatCount: service.seat_count,
              }),
            }
          : {}),
        ...(trialEnd ? { trial_end: trialEnd } : {}),
        ...(process.env.STRIPE_TAX_RATE_ID
          ? { default_tax_rates: [process.env.STRIPE_TAX_RATE_ID] }
          : {}),
      });

      const end = subscription.items.data[0]?.current_period_end;
      await admin
        .from("services")
        .update({
          status: "active",
          stripe_subscription_id: subscription.id,
          next_due_on: end ? new Date(end * 1000).toISOString().slice(0, 10) : service.next_due_on,
          due_alerted_at: null,
        })
        .eq("id", service.id);
    } catch (error) {
      console.error(`[portal] activateRemainingAutopay subscription failed for ${service.id}:`, error);
    }
  }

  for (const service of services ?? []) {
    if (!isVoipService(service.service_type)) continue;
    if (service.status === "paused" || service.status === "cancelled") continue;
    const { data: fresh } = await admin
      .from("services")
      .select("port_count, port_fee_charged_count, status")
      .eq("id", service.id)
      .maybeSingle();
    if (!fresh || fresh.status === "paused" || fresh.status === "cancelled") continue;
    const uncharged = voipUnchargedPorts(fresh.port_count, fresh.port_fee_charged_count);
    if (uncharged < 1) continue;
    try {
      await chargePortFeeOffSession({
        serviceId: service.id,
        profileId: input.profileId,
        customerId,
        paymentMethodId,
        uncharged,
        alreadyCharged: fresh.port_fee_charged_count,
      });
    } catch (error) {
      console.error(`[portal] activateRemainingAutopay port fee failed for ${service.id}:`, error);
    }
  }
}

export async function chargePortFeeOffSession(input: {
  serviceId: string;
  profileId: string;
  customerId: string;
  paymentMethodId: string;
  uncharged: number;
  alreadyCharged: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getPortalAdminClient();
  const nextCharged = input.alreadyCharged + input.uncharged;
  const { data: reserved } = await admin
    .from("services")
    .update({ port_fee_charged_count: nextCharged })
    .eq("id", input.serviceId)
    .eq("port_fee_charged_count", input.alreadyCharged)
    .select("id")
    .maybeSingle();
  if (!reserved) {
    return { ok: false, error: "The port fee for those numbers is already recorded." };
  }

  const stripe = getStripeClient();
  try {
    const portPrice = await resolveVoipNumberPortPriceId();
    const invoice = await stripe.invoices.create({
      customer: input.customerId,
      collection_method: "charge_automatically",
      default_payment_method: input.paymentMethodId,
      auto_advance: false,
      metadata: {
        service_id: input.serviceId,
        profile_id: input.profileId,
        kind: "voip_port_fee",
      },
      ...(process.env.STRIPE_TAX_RATE_ID
        ? { default_tax_rates: [process.env.STRIPE_TAX_RATE_ID] }
        : {}),
    });
    await stripe.invoiceItems.create({
      customer: input.customerId,
      invoice: invoice.id,
      pricing: { price: portPrice },
      quantity: input.uncharged,
      description: `Number port fee: ${input.uncharged} number${input.uncharged === 1 ? "" : "s"}`,
    });
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const paid =
      finalized.status === "paid"
        ? finalized
        : finalized.status === "open"
          ? await stripe.invoices.pay(finalized.id)
          : finalized;
    if (paid.status !== "paid") {
      await admin
        .from("services")
        .update({ port_fee_charged_count: input.alreadyCharged })
        .eq("id", input.serviceId)
        .eq("port_fee_charged_count", nextCharged);
      await stripe.invoices.voidInvoice(invoice.id).catch((error) => {
        console.error("[portal] port-fee invoice void failed:", error);
      });
      return { ok: false, error: "The card was not charged for the port fee." };
    }
    return { ok: true };
  } catch (error) {
    await admin
      .from("services")
      .update({ port_fee_charged_count: input.alreadyCharged })
      .eq("id", input.serviceId)
      .eq("port_fee_charged_count", nextCharged);
    throw error;
  }
}
