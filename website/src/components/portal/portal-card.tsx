import type { ReactNode } from "react";

/**
 * Shared card shell for the client dashboard: icon chip + title + optional
 * one-line description, consistent borders and spacing across every section.
 */

export type PortalIcon =
  | "shield"
  | "cloud"
  | "card"
  | "phone"
  | "voip"
  | "wrench";

const ICON_PATHS: Record<PortalIcon, ReactNode> = {
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"
    />
  ),
  cloud: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.5 18a4.5 4.5 0 01-.42-8.98 6 6 0 0111.7 1.28A3.75 3.75 0 0117.25 18H6.5z"
    />
  ),
  card: (
    <>
      <rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" d="M2.75 9.75h18.5M6.25 14.75h4" />
    </>
  ),
  phone: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 5.75c0-.83.67-1.5 1.5-1.5h2.1c.65 0 1.22.42 1.42 1.03l.96 2.87c.18.55.02 1.16-.41 1.55l-1.32 1.2a13.9 13.9 0 006.35 6.35l1.2-1.32c.39-.43 1-.59 1.55-.41l2.87.96c.61.2 1.03.77 1.03 1.42V20c0 .83-.67 1.5-1.5 1.5h-.75C10.9 21.5 4.5 15.1 4.5 7.25v-1.5z"
    />
  ),
  voip: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 7.75c0-.83.67-1.5 1.5-1.5h2.1c.65 0 1.22.42 1.42 1.03l.86 2.57c.18.55.02 1.16-.41 1.55l-1.12 1.02a12.9 12.9 0 005.73 5.73l1.02-1.12c.39-.43 1-.59 1.55-.41l2.57.86c.61.2 1.03.77 1.03 1.42V20c0 .83-.67 1.5-1.5 1.5h-.65C11.32 21.5 4.5 14.68 4.5 8.4v-.65z"
      />
      <path strokeLinecap="round" d="M15.25 6.5a4.25 4.25 0 012.9 2.9M16.4 3.25a7.5 7.5 0 014.35 4.35" />
    </>
  ),
  wrench: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.7 6.3a4.5 4.5 0 00-6 5.6L3.5 17.1a2 2 0 102.8 2.8l5.2-5.2a4.5 4.5 0 005.6-6l-3 3-2.8-.7-.7-2.8 3.1-2.9z"
    />
  ),
};

export function PortalCardIcon({ icon }: { icon: PortalIcon }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="h-5 w-5"
        aria-hidden
      >
        {ICON_PATHS[icon]}
      </svg>
    </span>
  );
}

export function PortalCard({
  icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon: PortalIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Rendered to the right of the header (e.g. a status badge). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-surface p-4 transition-colors hover:border-white/20 sm:p-7 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <PortalCardIcon icon={icon} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-white/50">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}
