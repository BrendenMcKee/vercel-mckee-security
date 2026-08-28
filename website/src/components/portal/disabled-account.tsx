import { SignOutButton } from "@/components/portal/sign-out-button";

/**
 * Every site this login can reach is disabled. Distinct from OrphanAccount
 * (no membership at all). docs/MULTI_SITE_ACCOUNTS.md item 4.
 */
export function DisabledAccount({ email }: { email: string | null }) {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        McKee Security Client Portal
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        This account is disabled
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
        Access for{" "}
        <span className="font-bold text-white">{email ?? "this sign-in"}</span>{" "}
        is turned off. If you think this is a mistake, contact McKee Security at{" "}
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
