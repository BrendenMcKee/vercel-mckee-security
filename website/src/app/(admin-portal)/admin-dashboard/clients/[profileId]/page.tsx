import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/portal/auth";
import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { AdminClientDetail } from "@/components/admin-portal/admin-client-detail";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  title: "Client Detail",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phase 3 client detail (PORTAL_PLAN.md 7.2): one page per client with
 * profile editing, service management (R21: all plan changes live here, on
 * the admin side only), and invitation state. Caller IDs and devices join in
 * Phase 4; payment history in Phase 5. Reads run on the user-context client
 * so admin RLS authorizes them (R13); the layout gate 404s non-admins.
 */
export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  // Pages render in parallel with the layout gate: signed-out visitors get
  // the layout's SignIn screen, so render nothing here instead of a 404.
  // Signed-in non-admins fall through; RLS returns no row and they 404,
  // matching the layout's neutral not-found response.
  const { user } = await getAuthContext();
  if (!user) return null;

  if (!UUID_RE.test(profileId)) notFound();

  const supabase = await createPortalServerClient();
  const { data: client, error } = await supabase
    .from("profiles")
    .select("*, services(*), invitations(id, target_email, expires_at, used_at, created_at)")
    .eq("id", profileId)
    .eq("role", "client")
    .maybeSingle();

  if (error) {
    console.error("[portal] Admin client detail query failed:", error);
    throw new Error("Client detail failed to load.");
  }
  if (!client) notFound();

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin-dashboard?tab=clients"
            className="text-sm font-bold uppercase tracking-widest text-primary hover:text-white"
          >
            &larr; All Clients
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {client.first_name} {client.last_name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10">
        <AdminClientDetail client={client} />
      </div>
    </section>
  );
}
