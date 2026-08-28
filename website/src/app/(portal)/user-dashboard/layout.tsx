import { resolvePortalSession } from "@/lib/portal/auth";
import { AuthFrame } from "@/components/portal/auth-frame";
import { SignIn } from "@/components/portal/sign-in";
import { OrphanAccount } from "@/components/portal/orphan-account";
import { DisabledAccount } from "@/components/portal/disabled-account";
import { PasswordSetup } from "@/components/portal/password-setup";
import { SignOutButton } from "@/components/portal/sign-out-button";

/**
 * Auth gate for the client dashboard (PORTAL_PLAN.md 6.1). Lives on the
 * user-dashboard segment, not the (portal) group, because /account/activate
 * must render for anonymous invitees.
 *
 * UX-level gate only: server actions re-check with tryRequireClientSite() /
 * requireSelectedSite() / requireAdmin() and RLS is the final authority (R6).
 * Extra members are linked via account_members, not profiles.user_id.
 */
export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolvePortalSession();

  if (session.kind === "signed_out") {
    return <SignIn />;
  }

  if (session.kind === "orphan") {
    console.warn(`[portal] Orphan session: auth user ${session.user.id} has no membership.`);
    return <OrphanAccount email={session.user.email} />;
  }

  if (session.kind === "client_disabled") {
    return <DisabledAccount email={session.user.email} />;
  }

  if (session.kind === "admin") {
    return (
      <AuthFrame
        variant="admin"
        eyebrow="McKee Security Staff Console"
        heading="You are an administrator"
        description="This is the client portal. Staff accounts do not have client services here. Sign in on the admin side to manage the business."
        footer={<SignOutButton />}
      >
        <a
          href="/admin-dashboard"
          className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400"
        >
          Open the admin dashboard
        </a>
      </AuthFrame>
    );
  }

  // Dummy-proofing (stakeholder 2026-07-05): a client who activated via Google
  // must set a backup password before the dashboard opens, so "I forgot which
  // way I sign in" can never lock anyone out. Per Auth user, not per site.
  if (!session.passwordSet) {
    return (
      <PasswordSetup
        variant="first-access"
        googleLinked={session.user.providers.includes("google")}
        email={session.user.email}
      />
    );
  }

  const profile = session.selectedSite;

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
