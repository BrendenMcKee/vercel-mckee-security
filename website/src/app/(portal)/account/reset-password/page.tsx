import type { Metadata } from "next";
import { getAuthContext } from "@/lib/portal/auth";
import { AuthFrame } from "@/components/portal/auth-frame";
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
      <AuthFrame
        variant="client"
        eyebrow="McKee Security Client Portal"
        heading="Link Expired"
        description="This password reset link is invalid, expired, or was already used. Enter your email and we will send you a fresh one."
      >
        <ResetLinkRequest />
      </AuthFrame>
    );
  }

  return <PasswordSetup variant="reset" email={user.email} />;
}
