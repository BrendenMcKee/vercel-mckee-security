"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { SERVICE_TIERS, isPerLineService } from "@/lib/portal/service-labels";
import { planMonthlyCents } from "@/lib/portal/billing";
import { getStripeClient, isStripeConfigured, priceIdFor } from "@/lib/portal/stripe";

export type ServiceActionResult = { ok: true } | { ok: false; error: string };

const assignSchema = z.object({
  profileId: z.uuid(),
  serviceType: z.enum(["monitoring", "cloud_backup", "voip"]),
  tier: z.string().min(1),
  lineCount: z.number().int().min(1).max(100).optional(),
});

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
  lineCount?: number;
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { profileId, serviceType, tier } = parsed.data;

  if (!SERVICE_TIERS[serviceType].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  // The confirmed monthly rate is prefilled so reminders and revenue KPIs are
  // correct from day one. Monitoring is invoiced annually (site terms); VoIP
  // bills monthly (R42), per line via line_count.
  const lineCount = isPerLineService(serviceType, tier) ? (parsed.data.lineCount ?? 1) : 1;
  const planRate = planMonthlyCents(serviceType, tier);
  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("services").insert({
    profile_id: profileId,
    service_type: serviceType,
    tier,
    line_count: lineCount,
    ...(planRate != null ? { monthly_amount_cents: planRate * lineCount } : {}),
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
    .select("id, service_type, line_count, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };

  if (!SERVICE_TIERS[service.service_type].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  // Per-line plans keep their line count; flat plans collapse back to 1.
  const lineCount = isPerLineService(service.service_type, tier) ? service.line_count : 1;

  // Phase 5 (9.1): a plan change on an autopay service swaps the Stripe
  // subscription price too, so the next invoice bills the new tier.
  if (service.stripe_subscription_id) {
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
        items: [{ id: itemId, price: priceId, quantity: lineCount }],
        proration_behavior: "none",
      });
    } catch (error) {
      console.error("[portal] Stripe tier swap failed:", error);
      return { ok: false, error: "Stripe rejected the plan change; the tier was not modified. Check the Stripe dashboard." };
    }
  }

  // A plan change re-syncs the amount to the confirmed rate (times lines for
  // per-line plans); the admin can still override it afterwards on the manual
  // rail in the Billing card.
  const planRate = planMonthlyCents(service.service_type, tier);
  const { error } = await supabase
    .from("services")
    .update({
      tier,
      line_count: lineCount,
      ...(planRate != null ? { monthly_amount_cents: planRate * lineCount } : {}),
    })
    .eq("id", serviceId);
  if (error) {
    console.error("[portal] updateServiceTier failed:", error);
    return { ok: false, error: "Could not change the tier. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

const lineCountSchema = z.object({
  serviceId: z.uuid(),
  lineCount: z.number().int().min(1).max(100),
});

/**
 * Line count change for per-line plans (all VoIP plans, R42). On autopay
 * the Stripe subscription quantity is updated too, so the next invoice bills
 * the new number of lines; the stored amount re-syncs to rate times lines.
 */
export async function updateServiceLineCountAction(input: {
  serviceId: string;
  lineCount: number;
}): Promise<ServiceActionResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = lineCountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a line count between 1 and 100." };
  const { serviceId, lineCount } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, tier, billing_method, stripe_subscription_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };
  if (!isPerLineService(service.service_type, service.tier)) {
    return { ok: false, error: "This plan is not billed per line." };
  }

  if (service.stripe_subscription_id) {
    if (!isStripeConfigured()) {
      return { ok: false, error: "This service has a Stripe subscription but Stripe is not configured on the server." };
    }
    try {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(service.stripe_subscription_id);
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) return { ok: false, error: "The Stripe subscription has no billable item. Fix it in Stripe first." };
      await stripe.subscriptions.update(service.stripe_subscription_id, {
        items: [{ id: itemId, quantity: lineCount }],
        proration_behavior: "none",
      });
    } catch (error) {
      console.error("[portal] Stripe line count update failed:", error);
      return { ok: false, error: "Stripe rejected the line change; nothing was modified. Check the Stripe dashboard." };
    }
  }

  const planRate = planMonthlyCents(service.service_type, service.tier);
  const { error } = await supabase
    .from("services")
    .update({
      line_count: lineCount,
      ...(planRate != null ? { monthly_amount_cents: planRate * lineCount } : {}),
    })
    .eq("id", serviceId);
  if (error) {
    console.error("[portal] updateServiceLineCount failed:", error);
    return { ok: false, error: "Could not change the line count. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
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

  if (service.stripe_subscription_id && status !== "unpaid") {
    if (!isStripeConfigured()) {
      return { ok: false, error: "This service has a Stripe subscription but Stripe is not configured on the server." };
    }
    try {
      const stripe = getStripeClient();
      if (status === "cancelled") {
        await stripe.subscriptions.update(service.stripe_subscription_id, { cancel_at_period_end: true });
      } else if (status === "paused") {
        await stripe.subscriptions.update(service.stripe_subscription_id, {
          pause_collection: { behavior: "void" },
        });
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
    .update({ status })
    .eq("id", serviceId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.error("[portal] updateServiceStatus failed:", error);
    return { ok: false, error: "Could not update the service. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
