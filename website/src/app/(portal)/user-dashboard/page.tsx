import type { Metadata } from "next";
import { createPortalServerClient } from "@/lib/portal/supabase/server";

export const metadata: Metadata = {
  title: "Manage Account",
  robots: { index: false, follow: false },
};

export default async function UserDashboardPage() {
  // Phase 0 gate: prove a server component reaches Supabase with the
  // publishable key. RLS gives anonymous callers zero rows from `units`,
  // so a non-error response is a successful round trip with no data exposure.
  // Phase 1 replaces this with the getClaims() session check.
  const supabase = await createPortalServerClient();
  const { error } = await supabase.from("units").select("id", { head: true, count: "exact" });
  const supabaseReachable = !error;

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Manage Account</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
        Securely manage your account information, cloud backups, and more. The client
        portal is under construction and will open soon.
      </p>
      <div className="mt-8 w-full rounded-2xl border border-white/10 bg-surface p-6 text-left">
        <p className="text-sm text-white/65">
          Questions about your services in the meantime? Call{" "}
          <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
            (705) 457-2156
          </a>{" "}
          or email{" "}
          <a
            href="mailto:info@mckeesecurity.ca"
            className="font-bold text-white hover:text-primary"
          >
            info@mckeesecurity.ca
          </a>
          .
        </p>
      </div>
      {!supabaseReachable && (
        <p className="mt-6 text-xs text-[#f57c00]">
          Portal services are temporarily unavailable. Please try again shortly.
        </p>
      )}
    </section>
  );
}
