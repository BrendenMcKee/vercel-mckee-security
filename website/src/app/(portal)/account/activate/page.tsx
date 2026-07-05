import type { Metadata } from "next";
import { validateInvitationToken } from "@/lib/portal/invitations";
import { getAuthContext } from "@/lib/portal/auth";
import { ActivateAccount } from "@/components/portal/activate-account";
import { ActivateAsCurrentUser } from "@/components/portal/activate-as-current-user";
import { SignOutButton } from "@/components/portal/sign-out-button";

export const metadata: Metadata = {
  title: "Activate Your Account",
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, string> = {
  session_expired:
    "Your Google sign-in took too long and the activation window expired. Open your activation link and try again.",
  email_mismatch:
    "The Google account you signed in with does not match the email this invitation was issued for. Open your activation link and use the matching account, or set a password instead.",
  already_linked:
    "You are signed in to an existing account, so this invitation could not be applied. Sign out first, then open your activation link again.",
  token_invalid:
    "This activation link is no longer valid.",
};

function ActivateShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      {children}
    </section>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <ActivateShell>
      <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Activation Problem
      </h1>
      <p className="mt-4 max-w-md text-center text-base leading-relaxed text-white/65">
        {message}
      </p>
      <p className="mt-6 max-w-md text-center text-sm text-white/50">
        Need a new invitation? Call McKee Security at{" "}
        <a href="tel:+17054572156" className="font-bold text-white/80 hover:text-white">
          (705) 457-2156
        </a>{" "}
        or email{" "}
        <a href="mailto:info@mckeesecurity.ca" className="font-bold text-white/80 hover:text-white">
          info@mckeesecurity.ca
        </a>
        .
      </p>
    </ActivateShell>
  );
}

/**
 * Activation entry point (PORTAL_PLAN.md 6.3/6.4). Token validation runs on
 * the service role because the visitor typically has no session yet. Never
 * cached: every visit re-validates.
 */
export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error && ERROR_COPY[error]) {
    return <ErrorScreen message={ERROR_COPY[error]} />;
  }

  if (!token) {
    return (
      <ErrorScreen message="This activation link is incomplete. Use the full link from your invitation email, or contact McKee Security for a new one." />
    );
  }

  const validation = await validateInvitationToken(token);

  if (validation.state === "expired") {
    return (
      <ErrorScreen message="This activation link has expired. Contact McKee Security and we will send you a fresh invitation." />
    );
  }
  if (validation.state === "used") {
    return (
      <ErrorScreen message="This activation link has already been used. If you set up your account, sign in at Manage Account. If this was not you, contact McKee Security immediately." />
    );
  }
  if (validation.state === "invalid") {
    return (
      <ErrorScreen message="This activation link is not valid. Check that you used the full link from your invitation email, or contact McKee Security for a new one." />
    );
  }

  const { invitation, profile } = validation;
  const { user, profile: sessionProfile } = await getAuthContext();

  // Already signed in: no account creation needed, just (maybe) link.
  if (user) {
    if (sessionProfile) {
      return (
        <ActivateShell>
          <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Already Signed In
          </h1>
          <p className="mt-4 max-w-md text-center text-base leading-relaxed text-white/65">
            You are signed in as{" "}
            <span className="font-bold text-white">{user.email}</span>, which is
            already an activated account. To use this invitation for a different
            account, sign out first and reopen your activation link.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </ActivateShell>
      );
    }

    const targetEmail = invitation.target_email?.toLowerCase() ?? null;
    if (targetEmail && targetEmail !== (user.email ?? "").toLowerCase()) {
      return (
        <ActivateShell>
          <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Wrong Account
          </h1>
          <p className="mt-4 max-w-md text-center text-base leading-relaxed text-white/65">
            You are signed in as{" "}
            <span className="font-bold text-white">{user.email}</span>, but this
            invitation was issued for a different email address. Sign out, then
            reopen your activation link with the matching account.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </ActivateShell>
      );
    }

    return (
      <ActivateShell>
        <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Welcome, {profile.first_name}
        </h1>
        <p className="mt-4 max-w-md text-center text-base leading-relaxed text-white/65">
          Finish setting up your McKee Security client portal account as{" "}
          <span className="font-bold text-white">{user.email}</span>.
        </p>
        <ActivateAsCurrentUser token={token} />
      </ActivateShell>
    );
  }

  return (
    <ActivateShell>
      <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Welcome, {profile.first_name}
      </h1>
      <p className="mt-4 max-w-md text-center text-base leading-relaxed text-white/65">
        Set up your McKee Security client portal account. Choose how you want to
        sign in: continue with Google, or set a password.
      </p>
      <ActivateAccount token={token} targetEmail={invitation.target_email} />
    </ActivateShell>
  );
}
