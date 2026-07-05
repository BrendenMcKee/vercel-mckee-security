"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { SERVICE_TIERS } from "@/lib/portal/service-labels";

export type ServiceActionResult = { ok: true } | { ok: false; error: string };

const assignSchema = z.object({
  profileId: z.uuid(),
  serviceType: z.enum(["monitoring", "cloud_backup"]),
  tier: z.string().min(1),
});

/**
 * Phase 3 admin service management (PORTAL_PLAN.md 7.2, R21): assignment,
 * tier changes, and status changes are admin-only actions. All writes run on
 * the user-context client so admin RLS policies are the authorization (R13);
 * clients have no write path to `services` at all.
 */
export async function assignServiceAction(input: {
  profileId: string;
  serviceType: "monitoring" | "cloud_backup";
  tier: string;
}): Promise<ServiceActionResult> {
  await requireAdmin();

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { profileId, serviceType, tier } = parsed.data;

  if (!SERVICE_TIERS[serviceType].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("services").insert({
    profile_id: profileId,
    service_type: serviceType,
    tier,
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
  await requireAdmin();

  const parsed = tierChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { serviceId, tier } = parsed.data;

  const supabase = await createPortalServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, service_type")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { ok: false, error: "Service not found." };

  if (!SERVICE_TIERS[service.service_type].includes(tier)) {
    return { ok: false, error: "That tier does not exist for this service." };
  }

  const { error } = await supabase.from("services").update({ tier }).eq("id", serviceId);
  if (error) {
    console.error("[portal] updateServiceTier failed:", error);
    return { ok: false, error: "Could not change the tier. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

const statusChangeSchema = z.object({
  serviceId: z.uuid(),
  status: z.enum(["active", "paused", "cancelled", "unpaid"]),
});

/**
 * Cancel / restart / pause (R21). Phase 5 layers Stripe semantics on top
 * (cancel_at_period_end etc.); until then status is a direct operational flag.
 */
export async function updateServiceStatusAction(input: {
  serviceId: string;
  status: "active" | "paused" | "cancelled" | "unpaid";
}): Promise<ServiceActionResult> {
  await requireAdmin();

  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { serviceId, status } = parsed.data;

  const supabase = await createPortalServerClient();
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
