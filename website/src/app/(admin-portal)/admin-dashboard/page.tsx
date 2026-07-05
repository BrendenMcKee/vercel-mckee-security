import type { Metadata } from "next";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { AdminClientsPanel } from "@/components/admin-portal/admin-clients-panel";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Phase 2: Clients tab with create-client + invitation management
 * (PORTAL_PLAN.md 7.2). Reads run on the user-context client: admin RLS
 * policies authorize them (R13). Phase 3 adds Overview and client detail.
 */
export default async function AdminDashboardPage() {
  const supabase = await createPortalServerClient();

  const { data: clients, error } = await supabase
    .from("profiles")
    .select("*, services(*), invitations(id, target_email, expires_at, used_at, created_at)")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[portal] Admin clients query failed:", error);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            McKee Security Internal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Admin Dashboard
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10">
        {error ? (
          <p className="rounded-xl border border-white/10 bg-surface p-6 text-sm text-[#f57c00]">
            Could not load clients. Refresh the page to try again.
          </p>
        ) : (
          <AdminClientsPanel clients={clients ?? []} />
        )}
      </div>
    </section>
  );
}
