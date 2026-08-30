"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { SESSION_ERROR_MESSAGE, tryRequireAdmin } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import { generateInvitationToken } from "@/lib/portal/invitations";
import { isClientMailEnabled } from "@/lib/portal/client-mail";
import { sendInvitationEmail } from "@/lib/portal/emails";
import { serviceMonthlyCents, todayIsoDate } from "@/lib/portal/billing";
import {
  CLOUD_BACKUP_DEVELOPMENT_MESSAGE,
  isServiceAvailable,
} from "@/lib/portal/service-labels";
import { DEVICE_CATEGORIES } from "@/lib/portal/devices";
import { normalizePhone } from "@/lib/portal/phone";
import {
  LANVAC_ACCOUNT_CODE_INPUT_MAX,
  LANVAC_CITY_MAX,
  LANVAC_CONTACT_NAME_MAX,
  LANVAC_PASSCODE_MAX,
  parseLanvacAccountCode,
  parseLanvacCity,
} from "@/lib/portal/lanvac";
import { getStripeClient, isStripeConfigured } from "@/lib/portal/stripe";
import { siteConfig } from "@/lib/site-config";
import { clearLanvacStationCache } from "@/lib/portal/lanvac-station-store";
import { hasLinkedPortalLogin } from "@/lib/portal/has-linked-login";
import { findEmailCollision } from "@/lib/portal/email-collision";
import { accountDisplayName } from "@/lib/portal/account-list";
import { MULTI_SITE_NO_SITE_INVITE_MESSAGE } from "@/lib/portal/invite-delivery";

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
  lanvacAccountCode: z.string().trim().max(LANVAC_ACCOUNT_CODE_INPUT_MAX),
  lanvacCity: z.string().trim().max(LANVAC_CITY_MAX),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

const createContactDraftSchema = z.object({
  label: z.string().trim().min(1).max(LANVAC_CONTACT_NAME_MAX),
  phone: z.string().trim().min(1),
  passcode: z.string().trim().min(1).max(LANVAC_PASSCODE_MAX),
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
      /** True when client mail is paused (import / pre-go-live). Not a send failure. */
      emailPaused: boolean;
      /** Mail is live, but this account has automatic onboarding off. */
      emailHeldAutoOnboard: boolean;
      /** Client exists; optional follow-up if contacts/devices did not save. */
      warning?: string;
    }
  | {
      ok: false;
      error: string;
      suggestAddSite?: { accountId: string; accountName: string };
    };

const addSiteSchema = createClientSchema.omit({ email: true }).extend({
  accountId: z.uuid(),
  email: z.string().trim().toLowerCase().max(320),
});

export type AddSiteInput = z.infer<typeof addSiteSchema>;

export type AddSiteResult =
  | { ok: true; profileId: string; accountName: string; warning?: string }
  | { ok: false; error: string };

type ParsedNewSite = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  phone: string;
  monitoringTier: CreateClientInput["monitoringTier"];
  cloudTier: CreateClientInput["cloudTier"];
  voipTier: CreateClientInput["voipTier"];
  voipNumbers: number;
  voipSeats: number;
  voipPorts: number;
  billingMethod: CreateClientInput["billingMethod"];
  storedPhone: string | null;
  lanvacCode: string | null;
  lanvacCity: string | null;
  seedContacts: { phone: string; label: string; passcode: string }[];
  seedDevices: z.infer<typeof createDeviceDraftSchema>[];
};

function parseNewSiteFields(
  input: CreateClientInput | AddSiteInput,
  extras: CreateClientExtras,
  options: { emailRequired: boolean },
): { ok: true; data: ParsedNewSite } | { ok: false; error: string } {
  const firstName = input.firstName;
  const lastName = input.lastName;
  const email = input.email;
  const address = input.address;
  const phone = input.phone;
  const monitoringTier = input.monitoringTier;
  const cloudTier = input.cloudTier;
  const voipTier = input.voipTier;
  const voipNumbers = input.voipNumbers;
  const voipSeats = input.voipSeats;
  const voipPorts = input.voipPorts;
  const billingMethod = input.billingMethod;
  const lanvacAccountCode = input.lanvacAccountCode;
  const lanvacCity = input.lanvacCity;

  if (options.emailRequired && !email) {
    return { ok: false, error: "Email is required" };
  }
  if (email) {
    const emailCheck = z.email("Enter a valid email address").safeParse(email);
    if (!emailCheck.success) {
      return { ok: false, error: emailCheck.error.issues[0]?.message ?? "Enter a valid email address" };
    }
  }

  const needsStation = Boolean(monitoringTier);
  const parsedCode = parseLanvacAccountCode(lanvacAccountCode, { required: needsStation });
  if (!parsedCode.ok) return { ok: false, error: parsedCode.error };
  const parsedCity = parseLanvacCity(lanvacCity, { required: needsStation });
  if (!parsedCity.ok) return { ok: false, error: parsedCity.error };

  let storedPhone: string | null = null;
  if (phone) {
    storedPhone = normalizePhone(phone);
    if (!storedPhone) {
      return { ok: false, error: "Enter a valid North American phone number, or leave it blank." };
    }
  }

  if (cloudTier && !isServiceAvailable("cloud_backup")) {
    return { ok: false, error: CLOUD_BACKUP_DEVELOPMENT_MESSAGE };
  }
  if (voipTier && voipPorts > voipNumbers) {
    return { ok: false, error: "Numbers being ported cannot exceed the numbers on the system." };
  }

  const seedContacts: { phone: string; label: string; passcode: string }[] = [];
  const seedDevices: z.infer<typeof createDeviceDraftSchema>[] = [];
  if (monitoringTier) {
    const seenIdentities = new Set<string>();
    for (const rawContact of extras.contacts ?? []) {
      const parsedContact = createContactDraftSchema.safeParse(rawContact);
      if (!parsedContact.success) {
        return { ok: false, error: parsedContact.error.issues[0]?.message ?? "Invalid alarm contact." };
      }
      const contactPhone = normalizePhone(parsedContact.data.phone);
      if (!contactPhone) {
        return { ok: false, error: `"${parsedContact.data.phone}" is not a valid North American phone number.` };
      }
      const identity = `${contactPhone}|${parsedContact.data.label}|${parsedContact.data.passcode}`;
      if (seenIdentities.has(identity)) {
        return { ok: false, error: `${parsedContact.data.label} with that number and passcode is already on the list.` };
      }
      if (seenIdentities.size >= 15) {
        return { ok: false, error: "The alarm contact list is capped at 15 people." };
      }
      seenIdentities.add(identity);
      seedContacts.push({
        phone: contactPhone,
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

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      address,
      phone,
      monitoringTier,
      cloudTier,
      voipTier,
      voipNumbers,
      voipSeats,
      voipPorts,
      billingMethod,
      storedPhone,
      lanvacCode: parsedCode.value,
      lanvacCity: parsedCity.value,
      seedContacts,
      seedDevices,
    },
  };
}

async function applySiteFollowup(
  supabase: Awaited<ReturnType<typeof createPortalServerClient>>,
  profileId: string,
  site: ParsedNewSite,
  options: { applyProfileExtras: boolean },
): Promise<string[]> {
  const seedWarnings: string[] = [];
  if (options.applyProfileExtras && (site.storedPhone || site.lanvacCode || site.lanvacCity)) {
    const { error: extrasError } = await supabase
      .from("profiles")
      .update({
        ...(site.storedPhone ? { phone: site.storedPhone } : {}),
        ...(site.lanvacCode ? { lanvac_account_code: site.lanvacCode } : {}),
        ...(site.lanvacCity ? { lanvac_city: site.lanvacCity } : {}),
      })
      .eq("id", profileId);
    if (extrasError) {
      console.error("[portal] site profile extras failed:", extrasError);
      seedWarnings.push(
        extrasError.code === "23505"
          ? "The site was created, but that Lanvac account code is already on another client. Set it on the client page."
          : "The site was created, but the Lanvac account or city could not be saved. Set it on the client page.",
      );
    }
  }

  if (site.monitoringTier || site.cloudTier || site.voipTier) {
    const { error: railError } = await supabase
      .from("services")
      .update({
        billing_method: site.billingMethod,
        ...(site.billingMethod === "manual" ? { next_due_on: todayIsoDate() } : {}),
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
  if (site.monitoringTier) pricePrefills.push({ serviceType: "monitoring", tier: site.monitoringTier });
  if (site.voipTier) {
    pricePrefills.push({
      serviceType: "voip",
      tier: site.voipTier,
      numberCount: site.voipNumbers,
      seatCount: site.voipTier === "professional" ? site.voipSeats : 1,
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

  if (site.seedContacts.length > 0) {
    const { error: contactError } = await supabase.from("caller_id_contacts").insert(
      site.seedContacts.map((contact, index) => ({
        profile_id: profileId,
        phone: contact.phone,
        label: contact.label,
        passcode: contact.passcode,
        sort_order: index + 1,
      })),
    );
    if (contactError) {
      console.error("[portal] site caller ID seed failed:", contactError);
      seedWarnings.push("The alarm contact list could not be saved. Open the client and add it there.");
    }
  }

  if (site.seedDevices.length > 0) {
    const { error: deviceError } = await supabase.from("devices").insert(
      site.seedDevices.map((device) => ({
        profile_id: profileId,
        label: device.label,
        category: device.category,
        installed_on: device.installedOn,
        lifetime_years: device.lifetimeYears,
      })),
    );
    if (deviceError) {
      console.error("[portal] site device seed failed:", deviceError);
      seedWarnings.push("A device could not be saved. Open the client and add it there.");
    }
  }

  return seedWarnings;
}

function autoOnboardFromEmbed(
  accounts: { auto_onboard: boolean } | { auto_onboard: boolean }[] | null | undefined,
): boolean {
  if (!accounts) return false;
  if (Array.isArray(accounts)) return accounts[0]?.auto_onboard === true;
  return accounts.auto_onboard === true;
}

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
  const site = parseNewSiteFields(parsed.data, extras, { emailRequired: true });
  if (!site.ok) return { ok: false, error: site.error };
  const {
    firstName,
    lastName,
    email,
    address,
    monitoringTier,
    cloudTier,
    voipTier,
    voipNumbers,
    voipSeats,
    voipPorts,
  } = site.data;

  const supabase = await createPortalServerClient();

  const collision = await findEmailCollision(supabase, email);
  if (!collision.ok) {
    return { ok: false, error: "Could not check whether that email is already in use. Please try again." };
  }
  if (collision.collision) {
    return {
      ok: false,
      error: `That email is already on the ${collision.collision.accountName} account. Add a site there instead of creating a second login.`,
      suggestAddSite: collision.collision,
    };
  }

  const { raw, hash } = generateInvitationToken();

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

  const seedWarnings = await applySiteFollowup(supabase, profileId, site.data, {
    applyProfileExtras: true,
  });

  const activateUrl = `${await getOrigin()}/account/activate?token=${raw}`;
  const [{ data: createdProfile }, mailEnabled] = await Promise.all([
    supabase
      .from("profiles")
      .select("account_id, accounts(auto_onboard)")
      .eq("id", profileId)
      .maybeSingle(),
    isClientMailEnabled(),
  ]);
  const autoOnboard = autoOnboardFromEmbed(createdProfile?.accounts);

  let emailSent = false;
  if (email && mailEnabled && autoOnboard) {
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
    emailPaused: !mailEnabled,
    emailHeldAutoOnboard: mailEnabled && !autoOnboard,
    warning: seedWarnings.length > 0 ? seedWarnings.join(" ") : undefined,
  };
}

export type ResendInviteResult =
  | {
      ok: true;
      activateUrl: string;
      emailSent: boolean;
      emailAttempted: boolean;
      emailPaused: boolean;
      emailHeldAutoOnboard: boolean;
    }
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
    .select("id, first_name, email, status, user_id, account_id, accounts(auto_onboard)")
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
    if (profile.account_id) {
      const { count, error: siteCountError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_id", profile.account_id)
        .eq("role", "client");
      if (siteCountError) {
        console.error("[portal] resendInvite site count failed:", siteCountError);
        return { ok: false, error: "Could not refresh the invitation. Please try again." };
      }
      if ((count ?? 0) > 1) {
        return { ok: false, error: MULTI_SITE_NO_SITE_INVITE_MESSAGE };
      }
    }
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
  const mailEnabled = await isClientMailEnabled();
  const autoOnboard = autoOnboardFromEmbed(profile.accounts);

  let emailSent = false;
  if (profile.email && mailEnabled && autoOnboard) {
    emailSent = await sendInvitationEmail({
      to: profile.email,
      firstName: profile.first_name,
      activateUrl,
      expiresAt,
    });
  }

  revalidatePath("/admin-dashboard", "layout");
  return {
    ok: true,
    activateUrl,
    emailSent,
    emailAttempted: Boolean(profile.email),
    emailPaused: !mailEnabled,
    emailHeldAutoOnboard: mailEnabled && !autoOnboard,
  };
}

/**
 * Add a site to an existing account. No invitation. auto_onboard turns off
 * once the account has (or is gaining) a second site. Status is active when
 * an Account admin has already signed in; otherwise pending with no mail.
 */
export async function addSiteToAccountAction(
  input: AddSiteInput,
  extras: CreateClientExtras = {},
): Promise<AddSiteResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = addSiteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const site = parseNewSiteFields(parsed.data, extras, { emailRequired: false });
  if (!site.ok) return { ok: false, error: site.error };

  const supabase = await createPortalServerClient();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("id", parsed.data.accountId)
    .maybeSingle();
  if (accountError) {
    console.error("[portal] addSite account lookup failed:", accountError);
    return { ok: false, error: "Could not load that account. Please try again." };
  }
  if (!account) return { ok: false, error: "Account not found." };

  const [{ data: owners, error: ownerError }, { count: existingSites, error: countError }] =
    await Promise.all([
      supabase
        .from("account_members")
        .select("user_id")
        .eq("account_id", account.id)
        .eq("role", "owner"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .eq("role", "client"),
    ]);
  if (ownerError || countError) {
    console.error("[portal] addSite account state failed:", ownerError ?? countError);
    return { ok: false, error: "Could not load that account. Please try again." };
  }

  const hasActivatedOwner = (owners ?? []).some((row) => Boolean(row.user_id));
  const siteStatus = hasActivatedOwner ? "active" : "pending";

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      account_id: account.id,
      first_name: site.data.firstName,
      last_name: site.data.lastName,
      email: site.data.email || null,
      address: site.data.address || null,
      phone: site.data.storedPhone,
      lanvac_account_code: site.data.lanvacCode,
      lanvac_city: site.data.lanvacCity,
      role: "client",
      status: siteStatus,
      user_id: null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[portal] addSite insert failed:", insertError);
    if (insertError?.code === "23505") {
      return {
        ok: false,
        error: "That Lanvac account code is already on another client. Use a different CODE.",
      };
    }
    return { ok: false, error: "Could not add the site. Please try again." };
  }

  const serviceRows: {
    profile_id: string;
    service_type: "monitoring" | "cloud_backup" | "voip";
    tier: string;
    billing_interval?: "annual";
    number_count?: number;
    seat_count?: number;
    port_count?: number;
  }[] = [];
  if (site.data.monitoringTier) {
    serviceRows.push({
      profile_id: inserted.id,
      service_type: "monitoring",
      tier: site.data.monitoringTier,
      billing_interval: "annual",
    });
  }
  if (site.data.cloudTier) {
    serviceRows.push({
      profile_id: inserted.id,
      service_type: "cloud_backup",
      tier: site.data.cloudTier,
    });
  }
  if (site.data.voipTier) {
    serviceRows.push({
      profile_id: inserted.id,
      service_type: "voip",
      tier: site.data.voipTier,
      number_count: site.data.voipNumbers,
      seat_count: site.data.voipTier === "professional" ? site.data.voipSeats : 1,
      port_count: site.data.voipPorts,
    });
  }

  const seedWarnings: string[] = [];
  if (serviceRows.length > 0) {
    const { error: serviceError } = await supabase.from("services").insert(serviceRows);
    if (serviceError) {
      console.error("[portal] addSite services failed:", serviceError);
      seedWarnings.push("The site was created, but services could not be saved. Open the site and add them.");
    }
  }

  seedWarnings.push(
    ...(await applySiteFollowup(supabase, inserted.id, site.data, { applyProfileExtras: false })),
  );

  if ((existingSites ?? 0) >= 1) {
    const { error: onboardError } = await supabase
      .from("accounts")
      .update({ auto_onboard: false })
      .eq("id", account.id);
    if (onboardError) {
      console.error("[portal] addSite auto_onboard off failed:", onboardError);
      seedWarnings.push("The site was added, but automatic onboarding could not be turned off. Use the Account card.");
    }
  }

  revalidatePath("/admin-dashboard", "layout");
  return {
    ok: true,
    profileId: inserted.id,
    accountName: accountDisplayName(account.name),
    warning: seedWarnings.length > 0 ? seedWarnings.join(" ") : undefined,
  };
}

export type SetAccountAutoOnboardResult = { ok: true } | { ok: false; error: string };

export async function setAccountAutoOnboardAction(input: {
  accountId: string;
  autoOnboard: boolean;
}): Promise<SetAccountAutoOnboardResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };
  if (!z.uuid().safeParse(input.accountId).success) {
    return { ok: false, error: "Account not found." };
  }

  const supabase = await createPortalServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({ auto_onboard: input.autoOnboard })
    .eq("id", input.accountId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[portal] set auto_onboard failed:", error);
    return { ok: false, error: "Could not update automatic onboarding. Please try again." };
  }
  if (!data) return { ok: false, error: "Account not found." };

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
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

const updateLanvacSchema = z.object({
  profileId: z.uuid(),
  lanvacAccountCode: z.string().trim().max(LANVAC_ACCOUNT_CODE_INPUT_MAX),
  lanvacCity: z.string().trim().max(LANVAC_CITY_MAX),
});

export type UpdateClientLanvacResult = { ok: true } | { ok: false; error: string };

/**
 * Admin sets the Lanvac account CODE and dispatch city. Police / fire /
 * ambulance stay station-owned; this city is what a later API write sends.
 */
export async function updateClientLanvacAction(input: {
  profileId: string;
  lanvacAccountCode: string;
  lanvacCity: string;
}): Promise<UpdateClientLanvacResult> {
  const adminAuth = await tryRequireAdmin();
  if (!adminAuth) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const parsed = updateLanvacSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createPortalServerClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, lanvac_account_code")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Client not found." };
  if (target.role !== "client") {
    return { ok: false, error: "Only client profiles can be edited here." };
  }

  const { data: monitoring } = await supabase
    .from("services")
    .select("id")
    .eq("profile_id", parsed.data.profileId)
    .eq("service_type", "monitoring")
    .maybeSingle();
  const hasMonitoring = Boolean(monitoring);
  const parsedCode = parseLanvacAccountCode(parsed.data.lanvacAccountCode, { required: hasMonitoring });
  if (!parsedCode.ok) return { ok: false, error: parsedCode.error };
  const parsedCity = parseLanvacCity(parsed.data.lanvacCity, { required: hasMonitoring });
  if (!parsedCity.ok) return { ok: false, error: parsedCity.error };

  const { error } = await supabase
    .from("profiles")
    .update({
      lanvac_account_code: parsedCode.value,
      lanvac_city: parsedCity.value,
    })
    .eq("id", parsed.data.profileId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another client already uses that Lanvac account code." };
    }
    if (error.code === "23514") {
      return { ok: false, error: "That Lanvac account or city is not a valid station value." };
    }
    console.error("[portal] updateClientLanvac failed:", error);
    return { ok: false, error: "Could not save the station fields. Please try again." };
  }

  if (target.lanvac_account_code !== parsedCode.value) {
    await clearLanvacStationCache({
      profileId: parsed.data.profileId,
      fromCode: target.lanvac_account_code,
      toCode: parsedCode.value,
      actorUserId: adminAuth.user.id,
      actorEmail: adminAuth.user.email,
    });
  }

  revalidatePath("/admin-dashboard", "layout");
  revalidatePath("/user-dashboard", "layout");
  return { ok: true };
}

export type SetClientStatusResult = { ok: true } | { ok: false; error: string };

/**
 * Disable is per site. The login stays open if the person still has another
 * active site. Re-enable is allowed when this row has a leftover user_id or
 * the account already has an activated Account admin (satellite sites have
 * user_id null by design).
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
    .select("id, role, user_id, account_id")
    .eq("id", input.profileId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Client not found." };
  if (target.role !== "client") {
    return { ok: false, error: "Only client accounts can be changed here." };
  }
  if (input.status === "active" && !target.user_id) {
    const admin = getPortalAdminClient();
    const { data: owner } = target.account_id
      ? await admin
          .from("account_members")
          .select("user_id")
          .eq("account_id", target.account_id)
          .eq("role", "owner")
          .not("user_id", "is", null)
          .maybeSingle()
      : { data: null };
    if (!owner?.user_id) {
      return { ok: false, error: "This client has not activated yet. Resend their invitation instead." };
    }
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
 * Permanently deletes **this site** and cascaded rows (services, invitations,
 * station cache). Restricted to `role='client'`. Stripe subscriptions on
 * this site are cancelled first; the Stripe customer is kept.
 *
 * Delete the profile (and empty account if last site) first. Only then
 * delete Auth, and only if that user has no remaining membership and no
 * remaining `profiles.user_id`.
 */
export async function deleteClientAction(input: {
  profileId: string;
  confirmName: string;
}): Promise<DeleteClientResult> {
  if (!(await tryRequireAdmin())) return { ok: false, error: SESSION_ERROR_MESSAGE };

  const { profileId, confirmName } = input;
  if (!z.uuid().safeParse(profileId).success) {
    return { ok: false, error: "Invalid site." };
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
      error: `The name you typed does not match this site (${fullName}). Nothing was deleted.`,
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
        // Keep the Stripe customer. Invoices stay in Stripe. Reuse only when
        // metadata.profile_id matches this site (or this site already has the id).
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
  const loginId = profile.user_id;

  const { error: profileError } = await admin.from("profiles").delete().eq("id", profileId);
  if (profileError) {
    console.error("[portal] deleteClient profile deletion failed:", profileError);
    return { ok: false, error: "Could not delete this site. Nothing else was removed; please try again." };
  }

  if (loginId) {
    const leftover = await hasLinkedPortalLogin(admin, loginId);
    if (!leftover.lookupFailed && !leftover.linked) {
      const { error: authError } = await admin.auth.admin.deleteUser(loginId);
      if (authError) {
        console.error("[portal] deleteClient leftover auth cleanup failed:", authError);
      }
    } else if (leftover.lookupFailed) {
      console.error("[portal] deleteClient leftover-login lookup failed; Auth user kept");
    }
  }

  revalidatePath("/admin-dashboard", "layout");
  return { ok: true };
}
