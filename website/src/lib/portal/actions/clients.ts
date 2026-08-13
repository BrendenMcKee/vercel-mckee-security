"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { generateInvitationToken } from "@/lib/portal/invitations";
import { sendInvitationEmail } from "@/lib/portal/emails";
import { serviceMonthlyCents, todayIsoDate } from "@/lib/portal/billing";
import {
  CLOUD_BACKUP_DEVELOPMENT_MESSAGE,
  isServiceAvailable,
} from "@/lib/portal/service-labels";
import { DEVICE_CATEGORIES } from "@/lib/portal/devices";
import { normalizePhone } from "@/lib/portal/phone";
import { getStripeClient, isStripeConfigured } from "@/lib/portal/stripe";
import { siteConfig } from "@/lib/site-config";

const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(40),
  monitoringTier: z.enum(["", "landline", "cellular", "cellular_tc", "cellular_tc_home"]),
  cloudTier: z.enum(["", "7day", "30day", "90day"]),
  voipTier: z.enum(["", "residential", "professional"]),
  voipNumbers: z.number().int().min(1).max(100),
  voipSeats: z.number().int().min(1).max(100),
  voipPorts: z.number().int().min(0).max(100),
  // Stakeholder 2026-07-06: billing is chosen at creation. Autopay is the
  // default; the client is asked for their card as part of activation.
  billingMethod: z.enum(["stripe", "manual"]),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

const createContactDraftSchema = z.object({
  label: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1),
  passcode: z.string().trim().min(1).max(40),
});

const createDeviceDraftSchema = z.object({
  label: z.string().trim().min(1).max(80),
  category: z.enum(DEVICE_CATEGORIES),
  installedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lifetimeYears: z.number().int().min(1).max(50),
});

export type CreateClientExtras = {
  contacts?: z.infer<typeof createContactDraftSchema>[];
  devices?: z.infer<typeof createDeviceDraftSchema>[];
};

export type CreateClientResult =
  | {
      ok: true;
      profileId: string;
      /** Shown once in the admin UI for manual delivery / copy. */
      activateUrl: string;
      emailSent: boolean;
      emailAttempted: boolean;
      /** Client exists; optional follow-up if contacts/devices did not save. */
      warning?: string;
    }
  | { ok: false; error: string };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteConfig.url;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Admin creates a client (PORTAL_PLAN.md 6.2): profile + services + invitation
 * atomically via the admin_create_client RPC (SECURITY INVOKER: the caller's
 * admin RLS policies authorize the inserts). Email failures never roll back
 * the created client; the admin gets the link to deliver manually.
 */
export async function createClientAction(
  input: CreateClientInput,
  extras: CreateClientExtras = {},
): Promise<CreateClientResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { firstName, lastName, email, address, phone, monitoringTier, cloudTier, voipTier, voipNumbers, voipSeats, voipPorts, billingMethod } =
    parsed.data;

  let storedPhone: string | null = null;
  if (phone) {
    storedPhone = normalizePhone(phone);
    if (!storedPhone) {
      return { ok: false, error: "Enter a valid North American phone number, or leave it blank." };
    }
  }

  // Keep the future service visible in the form without allowing a stale UI
  // or hand-crafted server-action request to assign it before Track 2 ships.
  if (cloudTier && !isServiceAvailable("cloud_backup")) {
    return { ok: false, error: CLOUD_BACKUP_DEVELOPMENT_MESSAGE };
  }
  if (voipTier && voipPorts > voipNumbers) {
    return { ok: false, error: "Numbers being ported cannot exceed the numbers on the system." };
  }

  const seedContacts: { phone: string; label: string; passcode: string }[] = [];
  const seedDevices: z.infer<typeof createDeviceDraftSchema>[] = [];
  if (monitoringTier) {
    const seenPhones = new Set<string>();
    for (const rawContact of extras.contacts ?? []) {
      const parsedContact = createContactDraftSchema.safeParse(rawContact);
      if (!parsedContact.success) {
        return { ok: false, error: parsedContact.error.issues[0]?.message ?? "Invalid alarm contact." };
      }
      const phone = normalizePhone(parsedContact.data.phone);
      if (!phone) {
        return { ok: false, error: `"${parsedContact.data.phone}" is not a valid North American phone number.` };
      }
      if (seenPhones.has(phone)) {
        return { ok: false, error: "The same phone number cannot appear twice on the alarm contact list." };
      }
      if (seenPhones.size >= 15) {
        return { ok: false, error: "The alarm contact list is capped at 15 people." };
      }
      seenPhones.add(phone);
      seedContacts.push({
        phone,
        label: parsedContact.data.label,
        passcode: parsedContact.data.passcode,
      });
    }
    for (const rawDevice of extras.devices ?? []) {
      const parsedDevice = createDeviceDraftSchema.safeParse(rawDevice);
      if (!parsedDevice.success) {
        return { ok: false, error: parsedDevice.error.issues[0]?.message ?? "Invalid device." };
      }
      if (new Date(parsedDevice.data.installedOn).getTime() > Date.now()) {
        return { ok: false, error: "Device install date cannot be in the future." };
      }
      seedDevices.push(parsedDevice.data);
    }
  }

  const { raw, hash } = generateInvitationToken();
  const supabase = await createPortalServerClient();

  const { data: profileId, error } = await supabase.rpc("admin_create_client", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email || "",
    p_address: address || "",
    p_monitoring_tier: monitoringTier,
    p_cloud_tier: cloudTier,
    p_token_hash: hash,
    p_target_email: email || "",
    p_voip_tier: voipTier,
    p_voip_numbers: voipTier ? voipNumbers : 1,
    p_voip_seats: voipTier === "professional" ? voipSeats : 1,
    p_voip_ports: voipTier ? voipPorts : 0,
  });

  if (error || !profileId) {
    console.error("[portal] createClient failed:", error);
    return { ok: false, error: "Could not create the client. Please try again." };
  }

  if (storedPhone) {
    const { error: phoneError } = await supabase
      .from("profiles")
      .update({ phone: storedPhone })
      .eq("id", profileId);
    if (phoneError) console.error("[portal] createClient phone set failed:", phoneError);
  }

  // The RPC created the services on the default (manual) rail; apply the
  // chosen billing method to all of them. Autopay clients are asked for
  // their card right on the dashboard after activation.
  if (monitoringTier || cloudTier || voipTier) {
    const { error: railError } = await supabase
      .from("services")
      .update({
        billing_method: billingMethod,
        ...(billingMethod === "manual" ? { next_due_on: todayIsoDate() } : {}),
      })
      .eq("profile_id", profileId);
    if (railError) console.error("[portal] billing method set failed:", railError);
  }

  const pricePrefills: {
    serviceType: "monitoring" | "voip";
    tier: string;
    numberCount?: number;
    seatCount?: number;
  }[] = [];
  if (monitoringTier) pricePrefills.push({ serviceType: "monitoring", tier: monitoringTier });
  if (voipTier) {
    pricePrefills.push({
      serviceType: "voip",
      tier: voipTier,
      numberCount: voipNumbers,
      seatCount: voipTier === "professional" ? voipSeats : 1,
    });
  }
  for (const prefill of pricePrefills) {
    const rate = serviceMonthlyCents(prefill);
    if (rate == null) continue;
    const { error: priceError } = await supabase
      .from("services")
      .update({ monthly_amount_cents: rate })
      .eq("profile_id", profileId)
      .eq("service_type", prefill.serviceType);
    if (priceError) console.error(`[portal] ${prefill.serviceType} price prefill failed:`, priceError);
  }

  const seedWarnings: string[] = [];
  if (seedContacts.length > 0) {
    const { error: contactError } = await supabase.from("caller_id_contacts").insert(
      seedContacts.map((contact, index) => ({
        profile_id: profileId,
        phone: contact.phone,
        label: contact.label,
        passcode: contact.passcode,
        sort_order: index + 1,
      })),
    );
    if (contactError) {
      console.error("[portal] createClient caller ID seed failed:", contactError);
      seedWarnings.push("The alarm contact list could not be saved. Open the client and add it there.");
    }
  }

  if (seedDevices.length > 0) {
    const { error: deviceError } = await supabase.from("devices").insert(
      seedDevices.map((device) => ({
        profile_id: profileId,
        label: device.label,
        category: device.category,
        installed_on: device.installedOn,
        lifetime_years: device.lifetimeYears,
      })),
    );
    if (deviceError) {
      console.error("[portal] createClient device seed failed:", deviceError);
      seedWarnings.push("A device could not be saved. Open the client and add it there.");
    }
  }

  const activateUrl = `${await getOrigin()}/account/activate?token=${raw}`;

  let emailSent = false;
  if (email) {
    const { data: invitation } = await supabase
      .from("invitations")
      .select("expires_at")
      .eq("profile_id", profileId)
      .is("used_at", null)
      .maybeSingle();
    emailSent = await sendInvitationEmail({
      to: email,
      firstName,
      activateUrl,
      expiresAt: invitation?.expires_at ?? new Date(Date.now() + 7 * 86400_000).toISOString(),
    });
  }

  revalidatePath("/admin-dashboard", "layout");
  return {
    ok: true,
    profileId,
    activateUrl,
    emailSent,
    emailAttempted: Boolean(email),
    warning: seedWarnings.length > 0 ? seedWarnings.join(" ") : undefined,
  };
}

export type ResendInviteResult =
  | { ok: true; activateUrl: string; emailSent: boolean; emailAttempted: boolean }
  | { ok: false; error: string };

/**
 * Resend (PORTAL_PLAN.md 6.2): rotate the open invitation in place (new hash,
 * fresh 7-day expiry) so the one-open-invitation-per-profile invariant holds
 * and the old link stops working. Inserts a new row when none is open (e.g.
 * cleaned up after 90 days).
 */
export async function resendInviteAction(profileId: string): Promise<ResendInviteResult> {
  const auth = await tryRequireAdmin();
  if (!auth) return { ok: false, error: SESSION_ERROR_MESSAGE };
  const { user } = auth;

  if (!z.uuid().safeParse(profileId).success) {
    return { ok: false, error: "Invalid client." };
  }

  const supabase = await createPortalServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, email, status, user_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Client not found." };
  if (profile.status !== "pending" || profile.user_id) {
    return { ok: false, error: "This client has already activated their account." };
  }

  const { raw, hash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("invitations")
    .update({
      token_hash: hash,
      expires_at: expiresAt,
      target_email: profile.email,
      created_by: user.id,
    })
    .eq("profile_id", profileId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[portal] resendInvite update failed:", updateError);
    return { ok: false, error: "Could not refresh the invitation. Please try again." };
  }

  if (!updated) {
    const { error: insertError } = await supabase.from("invitations").insert({
      profile_id: profileId,
      token_hash: hash,
      expires_at: expiresAt,
      target_email: profile.email,
      created_by: user.id,
    });
    if (insertError) {
      console.error("[portal] resendInvite insert failed:", insertError);
      return { ok: false, error: "Could not create the invitation. Please try again." };
    }
  }

  const activateUrl = `${await getOrigin()}/account/activate?token=${raw}`;

  let emailSent = false;
  if (profile.email) {
    emailSent = await sendInvitationEmail({
      to: profile.email,
      firstName: profile.first_name,
      activateUrl,
      expiresAt,
    });
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true, activateUrl, emailSent, emailAttempted: Boolean(profile.email) };
}

const updateProfileSchema = z.object({
  profileId: z.uuid(),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(40),
});

export type UpdateClientProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateClientProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Admin edits identity fields. Email here is the contact/invite email on the
 * profile; it does not change the sign-in email of an already-activated auth
 * user. Clients can update phone and service address themselves from Settings.
 */
export async function updateClientProfileAction(
  input: UpdateClientProfileInput,
): Promise<UpdateClientProfileResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { profileId, firstName, lastName, email, address, phone } = parsed.data;

  let storedPhone: string | null = null;
  if (phone) {
    storedPhone = normalizePhone(phone);
    if (!storedPhone) {
      return { ok: false, error: "Enter a valid North American phone number, or leave it blank." };
    }
  }

  const supabase = await createPortalServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Client not found." };
  if (target.role !== "client") {
    return { ok: false, error: "Only client profiles can be edited here." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      address: address || null,
      phone: storedPhone,
    })
    .eq("id", profileId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another client already uses that email." };
    }
    console.error("[portal] updateClientProfile failed:", error);
    return { ok: false, error: "Could not save the changes. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

export type SetClientStatusResult = { ok: true } | { ok: false; error: string };

/**
 * Disable locks the client out on next request (layout gate + requireUser both
 * reject disabled profiles); enable restores access. Distinct from deletion:
 * data and sign-in are preserved.
 */
export async function setClientStatusAction(input: {
  profileId: string;
  status: "active" | "disabled";
}): Promise<SetClientStatusResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  if (!z.uuid().safeParse(input.profileId).success) {
    return { ok: false, error: "Invalid client." };
  }
  if (input.status !== "active" && input.status !== "disabled") {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createPortalServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, user_id")
    .eq("id", input.profileId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Client not found." };
  if (target.role !== "client") {
    return { ok: false, error: "Only client accounts can be changed here." };
  }
  if (input.status === "active" && !target.user_id) {
    return { ok: false, error: "This client has not activated yet. Resend their invitation instead." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status: input.status })
    .eq("id", input.profileId);

  if (error) {
    console.error("[portal] setClientStatus failed:", error);
    return { ok: false, error: "Could not update the account. Please try again." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}

export type DeleteClientResult = { ok: true } | { ok: false; error: string };

/** Whitespace/case-insensitive name comparison for the delete confirmation. */
function namesMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return normalize(a) === normalize(b);
}

/**
 * Permanently deletes a client and every trace of them: auth user (sign-in),
 * profile, and via cascade their services and invitations. Restricted to
 * `role='client'` so an admin can never delete an admin account (or
 * themselves) from this surface. Runs on the service role because it spans
 * Supabase Auth + database; `requireAdmin()` is the authorization gate.
 *
 * Two extra safety gates (stakeholder round 3):
 * - the admin must type the client's full name, verified here on the server,
 *   not just in the browser;
 * - any live card subscriptions are cancelled in Stripe first, so a deleted
 *   client can never keep getting charged. If Stripe refuses, nothing is
 *   deleted. The Stripe customer is kept (invoices stay in Stripe); a later
 *   portal client with the same email reuses that customer instead of
 *   creating a duplicate.
 */
export async function deleteClientAction(input: {
  profileId: string;
  confirmName: string;
}): Promise<DeleteClientResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const { profileId, confirmName } = input;
  if (!z.uuid().safeParse(profileId).success) {
    return { ok: false, error: "Invalid client." };
  }

  // Read through the user-context client (admin RLS) so a revoked admin
  // cannot even resolve the target.
  const supabase = await createPortalServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, user_id, first_name, last_name, stripe_customer_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Client not found." };
  if (profile.role !== "client") {
    return { ok: false, error: "Only client accounts can be deleted here." };
  }

  const fullName = `${profile.first_name} ${profile.last_name}`;
  if (!namesMatch(confirmName ?? "", fullName)) {
    return {
      ok: false,
      error: `The name you typed does not match this client (${fullName}). Nothing was deleted.`,
    };
  }

  // Stop live card subscriptions before anything is removed.
  const { data: subscribedServices } = await supabase
    .from("services")
    .select("id, stripe_subscription_id")
    .eq("profile_id", profileId)
    .not("stripe_subscription_id", "is", null);
  const subscriptionIds = (subscribedServices ?? [])
    .map((s) => s.stripe_subscription_id)
    .filter((id): id is string => Boolean(id));

  if (subscriptionIds.length > 0 || profile.stripe_customer_id) {
    if (subscriptionIds.length > 0 && !isStripeConfigured()) {
      return {
        ok: false,
        error: "This client has automatic card payments but Stripe is not configured on the server. Nothing was deleted.",
      };
    }
    if (isStripeConfigured()) {
      try {
        const stripe = getStripeClient();
        for (const subscriptionId of subscriptionIds) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (subscription.status !== "canceled") {
            await stripe.subscriptions.cancel(subscriptionId, { prorate: false });
          }
        }
        // Keep the Stripe customer. Invoices and receipts stay in Stripe. A
        // later portal client with the same email reuses this customer.
        if (profile.stripe_customer_id) {
          await stripe.customers.update(profile.stripe_customer_id, {
            metadata: {
              profile_id: profile.id,
              portal_deleted_at: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        console.error("[portal] deleteClient Stripe cancel failed:", error);
        return {
          ok: false,
          error: "Could not stop the client's automatic card payments in Stripe, so nothing was deleted. Try again or check the Stripe dashboard.",
        };
      }
    }
  }

  const admin = getPortalAdminClient();

  if (profile.user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(profile.user_id);
    if (authError) {
      console.error("[portal] deleteClient auth deletion failed:", authError);
      return { ok: false, error: "Could not delete the client's sign-in. Nothing was removed; please try again." };
    }
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", profileId);
  if (profileError) {
    // Auth user is already gone; the remaining profile row is orphaned but
    // harmless and this action can be retried from the table.
    console.error("[portal] deleteClient profile deletion failed:", profileError);
    return { ok: false, error: "Sign-in removed, but profile data deletion failed. Retry to finish." };
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
