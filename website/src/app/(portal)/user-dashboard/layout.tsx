import { getAuthContext } from "@/lib/portal/auth";
import { SignIn } from "@/components/portal/sign-in";
import { OrphanAccount } from "@/components/portal/orphan-account";
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            McKee Security Client Portal
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            Welcome, {profile.first_name}
          </h1>
        </div>
        <SignOutButton />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
