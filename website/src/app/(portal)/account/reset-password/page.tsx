import type { Metadata } from "next";
import { getAuthContext } from "@/lib/portal/auth";
import { PasswordSetup } from "@/components/portal/password-setup";
import { ResetLinkRequest } from "@/components/portal/reset-link-request";

export const metadata: Metadata = {
  title: "Reset Your Password",
  robots: { index: false, follow: false },
};

/**
 * Forgot-password landing page. The emailed recovery link runs through
 * Supabase verification and the PKCE callback route, which establishes a
 * session and redirects here. No session = the link was invalid, expired, or
 * already used, so offer to send a fresh one.
 */
export default async function ResetPasswordPage() {
  const { user } = await getAuthContext();

  if (!user) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          McKee Security Client Portal
        </p>
        <h1 className="mt-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Link Expired
        </h1>
        <p className="mt-4 max-w-sm text-center text-base leading-relaxed text-white/65">
          This password reset link is invalid, expired, or was already used.
          Enter your email and we&apos;ll send you a fresh one.
        </p>
        <ResetLinkRequest />
      </section>
    );
  }

  return <PasswordSetup variant="reset" email={user.email} />;
}
