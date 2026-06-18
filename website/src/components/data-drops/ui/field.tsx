import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-primary disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-red-200",
      )}
    >
      {children}
    </p>
  );
}
