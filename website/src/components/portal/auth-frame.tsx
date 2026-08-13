import type { ReactNode } from "react";

/**
 * Shared chrome for client-facing auth screens (sign-in, activation, password
 * setup) and the staff console. The two variants must not look interchangeable:
 * a staff member landing on the client door should know immediately.
 */
export function AuthFrame({
  variant,
  eyebrow,
  heading,
  description,
  children,
  footer,
}: {
  variant: "client" | "admin";
  eyebrow: string;
  heading: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const isAdmin = variant === "admin";

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-3 py-12 sm:max-w-xl sm:px-4 sm:py-20">
      {isAdmin ? (
        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
          Staff only
        </span>
      ) : (
        <img
          src="/images/favicon-192.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10"
        />
      )}
      <p
        className={`mt-3 text-center text-xs font-bold uppercase tracking-[0.18em] sm:text-sm ${
          isAdmin ? "text-amber-300" : "text-primary"
        }`}
      >
        {eyebrow}
      </p>
      <h1 className="mt-3 text-center text-3xl font-bold text-white sm:mt-4 sm:text-4xl">
        {heading}
      </h1>
      {description && (
        <p className="mt-3 w-full text-center text-base leading-relaxed text-white/65 sm:mt-4">
          {description}
        </p>
      )}
      <div
        className={`mt-8 w-full rounded-2xl p-5 sm:p-6 ${
          isAdmin
            ? "border border-amber-400/25 bg-[#14110a] shadow-[inset_4px_0_0_0_rgba(251,191,36,0.85)]"
            : "border border-white/10 bg-surface"
        }`}
      >
        {!isAdmin && (
          <div
            className="mb-5 h-1 rounded-full bg-linear-to-r from-primary to-[#8f1010]"
            aria-hidden
          />
        )}
        {children}
      </div>
      {footer && (
        <div className="mt-6 w-full text-center text-sm leading-relaxed text-white/50">
          {footer}
        </div>
      )}
    </section>
  );
}
