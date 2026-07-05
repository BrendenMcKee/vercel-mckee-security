import type { Metadata } from "next";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_TYPE_LABELS,
  tierLabel,
} from "@/lib/portal/service-labels";
import { PAYMENT_INSTRUCTIONS, formatCents } from "@/lib/portal/billing";
import { DEVICE_LABELS, deviceExpiryDate, isDeviceExpired } from "@/lib/portal/devices";
import { ServiceStatusBadge } from "@/components/admin-portal/ui";
import { CallerIdEditor } from "@/components/portal/caller-id-editor";
import { PayNowButton } from "@/components/portal/pay-now-button";

export const metadata: Metadata = {
  title: "Manage Account",
  robots: { index: false, follow: false },
};

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Client dashboard (PORTAL_PLAN.md 7.1). Phase 3 gave it the read-only
 * monitoring/cloud cards; Phase 4 adds caller ID list management and device
 * maintenance; Phase 5 adds the payment banner (Stripe Pay Now vs manual
 * instructions). Reads go through RLS: a client can only see their own rows.
 */
export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  // Pages render in parallel with their layout, so unauthenticated visits
  // reach this code even though the layout shows SignIn instead. Render
  // nothing in every state the layout gates away.
  const { user, profile } = await getAuthContext();
  if (!user || !profile || profile.status === "disabled") return null;

  const { payment } = await searchParams;

  const supabase = await createPortalServerClient();
  const [servicesResult, contactsResult, devicesResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, service_type, tier, status, billing_method, monthly_amount_cents, next_due_on")
      .eq("profile_id", profile.id)
      .order("service_type"),
    supabase
      .from("caller_id_contacts")
      .select("phone, label")
      .eq("profile_id", profile.id)
      .order("created_at"),
    supabase
      .from("devices")
      .select("device_type, installed_on")
      .eq("profile_id", profile.id)
      .order("device_type"),
  ]);

  if (servicesResult.error || contactsResult.error || devicesResult.error) {
    console.error(
      "[portal] Client dashboard query failed:",
      servicesResult.error ?? contactsResult.error ?? devicesResult.error,
    );
    throw new Error("Dashboard failed to load.");
  }

  const services = servicesResult.data;
  const monitoring = services.find((s) => s.service_type === "monitoring");
  const cloud = services.find((s) => s.service_type === "cloud_backup");
  const unpaidServices = services.filter((s) => s.status === "unpaid");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {payment === "success" && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-200 md:col-span-2"
        >
          Payment successful — thank you! Your service is being activated now.
          A confirmation email is on its way; if the status below still shows
          unpaid, refresh in a few seconds.
        </p>
      )}
      {payment === "cancelled" && (
        <p
          role="status"
          className="rounded-2xl border border-white/15 bg-surface p-5 text-sm leading-relaxed text-white/70 md:col-span-2"
        >
          Checkout was cancelled — no charge was made. You can pay any time
          from the banner below.
        </p>
      )}

      {unpaidServices.map((service) => (
        <div
          key={service.id}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 md:col-span-2"
        >
          <h2 className="text-lg font-bold text-amber-100">
            Payment needed: {SERVICE_TYPE_LABELS[service.service_type]}
          </h2>
          {service.billing_method === "stripe" ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm leading-relaxed text-amber-200/90">
                Your {SERVICE_TYPE_LABELS[service.service_type].toLowerCase()} plan
                ({tierLabel(service.tier)}) is waiting on a payment. Pay securely
                by card below — renewals are automatic after that.
              </p>
              <PayNowButton serviceId={service.id} />
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-amber-200/90">
              <p>
                {service.monthly_amount_cents
                  ? `Amount due: ${formatCents(service.monthly_amount_cents)}${service.next_due_on ? `, due ${formatDate(service.next_due_on)}` : ""}.`
                  : "A payment is due on this service."}
              </p>
              <p>{PAYMENT_INSTRUCTIONS}</p>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <h2 className="text-lg font-bold text-white">
          {SERVICE_TYPE_LABELS.monitoring}
        </h2>
        {monitoring ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-bold text-white">{tierLabel(monitoring.tier)}</span>
              <ServiceStatusBadge status={monitoring.status} />
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Your monitoring plan is managed by McKee Security. To make changes,
              call{" "}
              <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
                (705) 457-2156
              </a>
              .
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            No monitoring service on this account. Interested? Call{" "}
            <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
              (705) 457-2156
            </a>{" "}
            to get set up.
          </p>
        )}
      </div>

      {cloud && (
        <div className="rounded-2xl border border-white/10 bg-surface p-6">
          <h2 className="text-lg font-bold text-white">
            {SERVICE_TYPE_LABELS.cloud_backup}
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-bold text-white">{tierLabel(cloud.tier)}</span>
              <ServiceStatusBadge status={cloud.status} />
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Your cloud backup plan runs on McKee-managed equipment. For plan
              questions or changes, contact McKee Security at{" "}
              <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
                (705) 457-2156
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {monitoring && (
        <div className="rounded-2xl border border-white/10 bg-surface p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-white">Alarm Contact List (Caller ID)</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            These are the people the monitoring station calls, in order, when
            your alarm goes off. Add or remove contacts and save — McKee
            Security is notified automatically and updates the station.
          </p>
          <div className="mt-5">
            <CallerIdEditor variant="client" initialContacts={contactsResult.data} />
          </div>
        </div>
      )}

      {devicesResult.data.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-white">Equipment Maintenance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {devicesResult.data.map((device) => {
              const expired = isDeviceExpired(device.device_type, device.installed_on);
              const expiry = deviceExpiryDate(device.device_type, device.installed_on);
              return (
                <div
                  key={device.device_type}
                  className={`rounded-xl border p-4 ${
                    expired
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-white/10 bg-background"
                  }`}
                >
                  <p className="font-bold text-white">{DEVICE_LABELS[device.device_type]}</p>
                  <p className="mt-1 text-sm text-white/65">
                    Installed {formatDate(device.installed_on)}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${expired ? "text-amber-300" : "text-white/65"}`}>
                    {expired
                      ? `Replacement was due ${expiry.toLocaleDateString("en-CA", { year: "numeric", month: "long" })} — call McKee to schedule it.`
                      : `Next replacement due ${expiry.toLocaleDateString("en-CA", { year: "numeric", month: "long" })}.`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
