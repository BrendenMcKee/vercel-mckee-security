"use client";

/** Error boundary with retry for the client dashboard segment (handover 22.3). */
export default function UserDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[portal] Client dashboard error boundary:", error);
  return (
    <section className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/65">
        Your dashboard failed to load. This is usually temporary. If it keeps
        happening, call{" "}
        <a href="tel:+17054572156" className="font-bold text-white hover:text-primary">
          (705) 457-2156
        </a>
        .
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)]"
      >
        Try Again
      </button>
    </section>
  );
}
