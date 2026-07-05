import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activate Your Account",
  robots: { index: false, follow: false },
};

/**
 * Phase 0 shell. Phase 2 implements token validation and the Google /
 * email-password activation chooser (PORTAL_PLAN.md Sections 6.3, 6.4).
 */
export default function ActivateAccountPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Activate Your Account
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
        Account activation is not open yet. If you received an invitation from McKee
        Security, please contact us and we will help you get set up.
      </p>
    </section>
  );
}
