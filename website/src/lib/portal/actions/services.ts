"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  CLOUD_BACKUP_DEVELOPMENT_MESSAGE,
  SERVICE_TIERS,
  isServiceAvailable,
  isVoipService,
} from "@/lib/portal/service-labels";
import {
  normalizeVoipConfig,
  normalizeVoipPorts,
  serviceMonthlyCents,
  voipInvoiceDescription,
} from "@/lib/portal/billing";
import { getStripeClient, isStripeConfigured, priceForVoipAmount, priceIdFor } from "@/lib/portal/stripe";

export type ServiceActionResult = { ok: true; message?: string } | { ok: false; error: string };

const assignSchema = z.object({
  profileId: z.uuid(),
  serviceType: z.enum(["monitoring", "cloud_backup", "voip"]),
  tier: z.string().min(1),
  numberCount: z.number().int().min(1).max(100).optional(),
  seatCount: z.number().int().min(1).max(100).optional(),
  portCount: z.number().int().min(0).max(100).optional(),
});

async function syncVoipStripePrice(input: {
  subscriptionId: string;
  tier: string;
  numberCount: number;
  seatCount: number;
  amountCents: number;
}): Promise<string | null> {
  if (!isStripeConfigured()) {
    return "This service has a Stripe subscription but Stripe is not configured on the server.";
  }
  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return "The Stripe subscription has no billable item. Fix it in Stripe first.";
    const priceId = await priceForVoipAmount({
      tier: input.tier,
      amountCents: input.amountCents,
      numberCount: input.numberCount,
      seatCount: input.seatCount,
    });
    await stripe.subscriptions.update(input.subscriptionId, {
      items: [{ id: itemId, price: priceId, quantity: 1 }],
      description: voipInvoiceDescription({
        tier: input.tier,
        numberCount: input.numberCount,
        seatCount: input.seatCount,
      }),
      proration_behavior: "none",
    });
    return null;
  } catch (error) {
    console.error("[portal] Stripe VoIP price sync failed:", error);
    return "Stripe rejected the change; nothing was modified. Check the Stripe dashboard.";
  }
}

/**
 * Phase 3 admin service management (PORTAL_PLAN.md 7.2, R21): assignment,
 * tier changes, and status changes are admin-only actions. All writes run on
 * the user-context client so admin RLS policies are the authorization (R13);
 * clients have no write path to `services` at all.
 */
export async function assignServiceAction(input: {
  profileId: string;
  serviceType: "monitoring" | "cloud_backup" | "voip";
  tier: string;
  numberCount?: number;
  seatCount?: number;
  portCount?: number;
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { profileId, serviceType, tier } = parsed.data;

  if (!isServiceAvailable(serviceType)) {
    return { ok: false, error: CLOUD_BACKUP_DEVELOPMENT_MESSAGE };
  }

  if (!SERVICE_TIERS[serviceType].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  const voip = isVoipService(serviceType)
    ? normalizeVoipConfig({
        tier,
        numberCount: parsed.data.numberCount ?? 1,
        seatCount: parsed.data.seatCount ?? 1,
      })
    : null;
  const monthly = serviceMonthlyCents({
    serviceType,
    tier,
    numberCount: voip?.numberCount,
    seatCount: voip?.seatCount,
  });

  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("services").insert({
    profile_id: profileId,
    service_type: serviceType,
    tier,
    ...(voip
      ? {
          number_count: voip.numberCount,
          seat_count: voip.seatCount,
          port_count: normalizeVoipPorts(voip.numberCount, parsed.data.portCount ?? 0),
        }
      : {}),
    ...(monthly != null ? { monthly_amount_cents: monthly } : {}),
    ...(serviceType === "monitoring" ? { billing_interval: "annual" as const } : {}),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This client already has that service. Change its tier instead." };
    }
    console.error("[portal] assignService failed:", error);
    return { ok: false, error: "Could not assign the service. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

const tierChangeSchema = z.object({
  serviceId: z.uuid(),
  tier: z.string().min(1),
});

export async function updateServiceTierAction(input: {
  serviceId: string;
  tier: string;
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = tierChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { serviceId, tier } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, status, number_count, seat_count, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };
  if (service.status === "cancelled") {
    return { ok: false, error: "Restart this service before changing the plan. A cancelled service is not billed." };
  }

  if (!SERVICE_TIERS[service.service_type].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  const voip = isVoipService(service.service_type)
    ? normalizeVoipConfig({
        tier,
        numberCount: service.number_count,
        seatCount: service.seat_count,
      })
    : null;
  const monthly = serviceMonthlyCents({
    serviceType: service.service_type,
    tier,
    numberCount: voip?.numberCount,
    seatCount: voip?.seatCount,
  });

  if (service.stripe_subscription_id) {
    if (voip && monthly != null) {
      const stripeError = await syncVoipStripePrice({
        subscriptionId: service.stripe_subscription_id,
        tier,
        numberCount: voip.numberCount,
        seatCount: voip.seatCount,
        amountCents: monthly,
      });
      if (stripeError) return { ok: false, error: stripeError };
    } else {
      if (!isStripeConfigured()) {
        return { ok: false, error: "This service has a Stripe subscription but Stripe is not configured on the server." };
      }
      const priceId = priceIdFor(service.service_type, tier);
      if (!priceId) {
        return { ok: false, error: "No Stripe price is configured for that tier yet. Add the price ID env var first." };
      }
      try {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(service.stripe_subscription_id);
        const itemId = subscription.items.data[0]?.id;
        if (!itemId) return { ok: false, error: "The Stripe subscription has no billable item. Fix it in Stripe first." };
        await stripe.subscriptions.update(service.stripe_subscription_id, {
          items: [{ id: itemId, price: priceId, quantity: 1 }],
          proration_behavior: "none",
        });
      } catch (error) {
        console.error("[portal] Stripe tier swap failed:", error);
        return { ok: false, error: "Stripe rejected the plan change; the tier was not modified. Check the Stripe dashboard." };
      }
    }
  }

  const { error } = await supabase
    .from("services")
    .update({
      tier,
      ...(voip ? { number_count: voip.numberCount, seat_count: voip.seatCount } : {}),
      ...(monthly != null ? { monthly_amount_cents: monthly } : {}),
    })
    .eq("id", serviceId);
  if (error) {
    console.error("[portal] updateServiceTier failed:", error);
    return { ok: false, error: "Could not change the tier. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

const voipConfigSchema = z.object({
  serviceId: z.uuid(),
  numberCount: z.number().int().min(1).max(100),
  seatCount: z.number().int().min(1).max(100),
  portCount: z.number().int().min(0).max(100),
});

/**
 * Numbers, seats, and pending port count for a VoIP system (R50). On autopay
 * the Stripe subscription is swapped to a single price at the new total
 * (quantity 1). Residential seats are forced to 1.
 */
export async function updateVoipConfigAction(input: {
  serviceId: string;
  numberCount: number;
  seatCount: number;
  portCount: number;
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = voipConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter valid number, seat, and port counts." };
  const { serviceId } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, status, tier, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };
  if (service.status === "cancelled") {
    return { ok: false, error: "Restart this service before changing numbers or seats." };
  }
  if (!isVoipService(service.service_type)) {
    return { ok: false, error: "Only VoIP services have numbers and seats." };
  }

  const voip = normalizeVoipConfig({
    tier: service.tier,
    numberCount: parsed.data.numberCount,
    seatCount: parsed.data.seatCount,
  });
  const monthly = voipMonthlyOrError(service.tier, voip.numberCount, voip.seatCount);
  if (monthly == null) return { ok: false, error: "That VoIP plan has no rate." };

  if (service.stripe_subscription_id) {
    const stripeError = await syncVoipStripePrice({
      subscriptionId: service.stripe_subscription_id,
      tier: service.tier,
      numberCount: voip.numberCount,
      seatCount: voip.seatCount,
      amountCents: monthly,
    });
    if (stripeError) return { ok: false, error: stripeError };
  }

  const { error } = await supabase
    .from("services")
    .update({
      number_count: voip.numberCount,
      seat_count: voip.seatCount,
      port_count: normalizeVoipPorts(voip.numberCount, parsed.data.portCount),
      monthly_amount_cents: monthly,
    })
    .eq("id", serviceId);
  if (error) {
    console.error("[portal] updateVoipConfig failed:", error);
    return { ok: false, error: "Could not save the VoIP configuration. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

function voipMonthlyOrError(tier: string, numberCount: number, seatCount: number): number | null {
  return serviceMonthlyCents({ serviceType: "voip", tier, numberCount, seatCount });
}

const statusChangeSchema = z.object({
  serviceId: z.uuid(),
  status: z.enum(["active", "paused", "cancelled", "unpaid"]),
});

/**
 * Cancel / restart / pause (R21). For autopay services the Stripe
 * subscription is kept in sync (9.1): cancel sets cancel_at_period_end, pause
 * voids collection, reactivate clears both. The webhook confirms the final
 * state when Stripe processes it.
 */
export async function updateServiceStatusAction(input: {
  serviceId: string;
  status: "active" | "paused" | "cancelled" | "unpaid";
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { serviceId, status } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };

  let paidThrough: string | null = null;
  let endedSubscription = false;
  if (service.stripe_subscription_id && status !== "unpaid") {
    if (!isStripeConfigured()) {
      return { ok: false, error: "This service has a Stripe subscription but Stripe is not configured on the server." };
    }
    try {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(service.stripe_subscription_id);
      const end = subscription.items.data[0]?.current_period_end;
      paidThrough = end ? new Date(end * 1000).toISOString().slice(0, 10) : null;
      if (status === "cancelled") {
        if (subscription.status !== "canceled") {
          await stripe.subscriptions.update(service.stripe_subscription_id, { cancel_at_period_end: true });
        }
      } else if (status === "paused") {
        if (subscription.status === "canceled") {
          return {
            ok: false,
            error: "The Stripe subscription has already ended. Restart first, then have the client set up card payments again.",
          };
        }
        await stripe.subscriptions.update(service.stripe_subscription_id, {
          pause_collection: { behavior: "void" },
          cancel_at_period_end: false,
        });
      } else if (subscription.status === "canceled") {
        // Period already ended; Stripe will not accept updates. Drop the
        // stale id so the client can start a new Checkout session.
        endedSubscription = true;
      } else {
        await stripe.subscriptions.update(service.stripe_subscription_id, {
          cancel_at_period_end: false,
          pause_collection: "",
        });
      }
    } catch (error) {
      console.error("[portal] Stripe status sync failed:", error);
      return { ok: false, error: "Stripe rejected the change; the service was not modified. Check the Stripe dashboard." };
    }
  }

  const { data: updated, error } = await supabase
    .from("services")
    .update({
      status,
      ...(endedSubscription ? { stripe_subscription_id: null } : {}),
    })
    .eq("id", serviceId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.error("[portal] updateServiceStatus failed:", error);
    return { ok: false, error: "Could not update the service. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  let message: string | undefined;
  if (status === "cancelled" && service.stripe_subscription_id) {
    message = paidThrough
      ? `Cancelled. Automatic card payments stop after ${paidThrough}; they stay paid through that date.`
      : "Cancelled. Automatic card payments will stop at the end of the current period.";
  } else if (status === "paused" && service.stripe_subscription_id) {
    message = "Paused. Stripe will not charge the card until you restart.";
  } else if (status === "active" && endedSubscription) {
    message = "Restarted. The previous card subscription has ended; the client can set up automatic payments again.";
  } else if (status === "active" && service.stripe_subscription_id) {
    message = "Restarted. Automatic card payments will continue in Stripe.";
  }
  return { ok: true, message };
}
