import { SignOutButton } from "@/components/portal/sign-out-button";

/**
 * Shown when a session exists but no profile is linked (PORTAL_PLAN.md 6.1
 * step 5): typically a Google sign-in without an invitation (R9). RLS already
 * guarantees this user can read nothing.
 */
export function OrphanAccount({ email }: { email: string | null }) {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        Account Not Found
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
        We could not find an account for{" "}
        <span className="font-bold text-white">{email ?? "this sign-in"}</span>. If you
        received an invitation from McKee Security, please use your activation link. Otherwise,
        contact us at{" "}
        <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
          (705) 457-2156
        </a>{" "}
        or{" "}
        <a
          href="mailto:info@mckeesecurity.ca"
          className="font-bold text-white hover:text-primary"
        >
          info@mckeesecurity.ca
        </a>
        .
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </section>
  );
}
