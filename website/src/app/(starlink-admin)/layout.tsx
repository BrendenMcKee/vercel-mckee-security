import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SL_ADMIN_COOKIE, isGateConfigured, isUnlocked } from "@/lib/starlink/gate";
import { isSupabaseConfigured } from "@/lib/starlink/supabase-admin";
import { StarlinkAdminLock } from "@/components/starlink-admin/starlink-admin-lock";
import { StarlinkAdminNotConfigured } from "@/components/starlink-admin/starlink-admin-not-configured";
import "@/styles/starlink-admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StarlinkAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isGateConfigured() && isSupabaseConfigured();
  const store = await cookies();
  const unlocked = isUnlocked(store.get(SL_ADMIN_COOKIE)?.value);

  return (
    <div className="sl-admin">
      {!configured ? (
        <StarlinkAdminNotConfigured />
      ) : unlocked ? (
        children
      ) : (
        <StarlinkAdminLock />
      )}
    </div>
  );
}
