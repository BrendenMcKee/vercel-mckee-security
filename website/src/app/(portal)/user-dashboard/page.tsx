import type { Metadata } from "next";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  SERVICE_TYPE_LABELS,
  tierLabel,
} from "@/lib/portal/service-labels";
import { ServiceStatusBadge } from "@/components/admin-portal/ui";

export const metadata: Metadata = {
  title: "Manage Account",
  robots: { index: false, follow: false },
};

/**
 * Phase 3 client dashboard (PORTAL_PLAN.md 7.1): monitoring card is fully
 * read-only (handover 6.2) and the cloud backup card is display-only with no
 * plan controls (R21); it is hidden entirely when the client has no cloud
 * service. Caller ID and devices cards join in Phase 4, the payment banner in
 * Phase 5. Reads go through RLS: a client can only ever see their own rows.
 */
export default async function UserDashboardPage() {
  // Pages render in parallel with their layout, so unauthenticated visits
  // reach this code even though the layout shows SignIn instead. Render
  // nothing in every state the layout gates away.
  const { user, profile } = await getAuthContext();
  if (!user || !profile || profile.status === "disabled") return null;

  const supabase = await createPortalServerClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("id, service_type, tier, status")
    .eq("profile_id", profile.id)
    .order("service_type");

  if (error) {
    console.error("[portal] Client services query failed:", error);
    throw new Error("Dashboard failed to load.");
  }

  const monitoring = services.find((s) => s.service_type === "monitoring");
  const cloud = services.find((s) => s.service_type === "cloud_backup");

  return (
    <div className="grid gap-6 md:grid-cols-2">
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

      <div className="rounded-2xl border border-white/10 bg-surface p-6 md:col-span-2">
        <h2 className="text-lg font-bold text-white">Coming soon</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Caller ID list management and device maintenance tracking are on the
          way. Questions in the meantime? Call{" "}
          <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
            (705) 457-2156
          </a>
          .
        </p>
      </div>
    </div>
  );
}
