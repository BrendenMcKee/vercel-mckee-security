"use client";

/**
 * Password field with a reveal eyeball (stakeholder 2026-07-05). Reveal state
 * is owned by the parent form so password + confirm fields show/hide together:
 * toggling either eyeball reveals both. Default is hidden (struck-through eye).
 */
export function PasswordInput({
  revealed,
  onToggleReveal,
  ...inputProps
}: {
  revealed: boolean;
  onToggleReveal: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  return (
    <div className="relative">
      <input
        type={revealed ? "text" : "password"}
        {...inputProps}
        className="w-full rounded-xl border border-white/15 bg-background py-3 pl-4 pr-12 text-white outline-none transition-colors focus:border-primary"
      />
      <button
        type="button"
        onClick={onToggleReveal}
        aria-label={revealed ? "Hide passwords" : "Show passwords"}
        aria-pressed={revealed}
        title={revealed ? "Hide passwords" : "Show passwords"}
        className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-white/40 transition-colors hover:text-white/80"
      >
        {revealed ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 7.94 7.22 5 12 5s8.58 2.94 9.94 6.65a1 1 0 0 1 0 .7C20.58 16.06 16.78 19 12 19s-8.58-2.94-9.94-6.65Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c4.78 0 8.58 2.94 9.94 6.65a1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.68 2.9" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.42 16.06 7.22 19 12 19c1.32 0 2.6-.22 3.79-.64" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
