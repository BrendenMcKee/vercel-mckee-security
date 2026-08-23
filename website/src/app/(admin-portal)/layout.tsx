import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/portal/auth";
import { AuthFrame } from "@/components/portal/auth-frame";
import { SignIn } from "@/components/portal/sign-in";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Admin gate (PORTAL_PLAN.md 6.5). Signed-out visitors get SignIn in place.
 * A signed-in client gets the same wrong-door screen admins see on
 * /user-dashboard, pointed back at the client portal. Anyone else who is
 * not an active admin still gets a neutral not-found.
 *
 * Every admin server action independently re-checks with requireAdmin() (R6).
 */
export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    return <SignIn next="/admin-dashboard" variant="admin" />;
  }

  if (profile?.role === "client") {
    return (
      <AuthFrame
        variant="client"
        badge="Client portal"
        eyebrow="McKee Security Client Portal"
        heading="You are a client"
        description="This is the staff console. Client accounts do not manage the business here. Open your portal to see your services."
        footer={<SignOutButton />}
      >
        <a
          href="/user-dashboard"
          className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-(--primary-hover)"
        >
          Open the client portal
        </a>
      </AuthFrame>
    );
  }

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    console.warn(`[portal] Non-admin access attempt on admin portal: auth user ${user.id}.`);
    notFound();
  }

  return <div className="portal-area">{children}</div>;
}
