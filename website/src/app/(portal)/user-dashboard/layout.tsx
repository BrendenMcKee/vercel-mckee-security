import { getAuthContext } from "@/lib/portal/auth";
import { SignIn } from "@/components/portal/sign-in";
import { OrphanAccount } from "@/components/portal/orphan-account";
import { PasswordSetup } from "@/components/portal/password-setup";
import { SignOutButton } from "@/components/portal/sign-out-button";

/**
 * Auth gate for the client dashboard (PORTAL_PLAN.md 6.1). Lives on the
 * user-dashboard segment, not the (portal) group, because /account/activate
 * must render for anonymous invitees.
 *
 * UX-level gate only: server actions re-check with requireUser()/requireAdmin()
 * and RLS is the final authority (R6).
 */
export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    return <SignIn />;
  }

  if (!profile) {
    console.warn(`[portal] Orphan session: auth user ${user.id} has no linked profile.`);
    return <OrphanAccount email={user.email} />;
  }

  if (profile.status === "disabled") {
    return <OrphanAccount email={user.email} />;
  }

  // Dummy-proofing (stakeholder 2026-07-05): a client who activated via Google
  // must set a backup password before the dashboard opens, so "I forgot which
  // way I sign in" can never lock anyone out. Enforced on every visit until set.
  if (profile.role === "client" && !profile.password_set_at) {
    return (
      <PasswordSetup
        variant="first-access"
        googleLinked={user.providers.includes("google")}
        email={user.email}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
            McKee Security Client Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Welcome, {profile.first_name}
          </h1>
          {profile.email && (
            <p className="mt-1 break-all text-sm text-white/45">{profile.email}</p>
          )}
        </div>
        <SignOutButton />
      </div>
      <div className="mt-6 sm:mt-8">{children}</div>
    </div>
  );
}
