import type { ReactNode } from "react";
import { SERVICE_THEME, type ServiceType } from "@/lib/portal/service-labels";

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
  | "wrench"
  | "settings";

export type PortalCardTone = ServiceType | "billing" | "muted";

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
  settings: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.7 7.7 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.93 6.93 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
};

const TONE_ICON: Record<PortalCardTone, string> = {
  monitoring: SERVICE_THEME.monitoring.icon,
  voip: SERVICE_THEME.voip.icon,
  cloud_backup: SERVICE_THEME.cloud_backup.icon,
  billing: "bg-white/10 text-white/80",
  muted: "bg-white/5 text-white/35",
};

export function PortalCardIcon({
  icon,
  tone = "billing",
}: {
  icon: PortalIcon;
  tone?: PortalCardTone;
}) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}
    >
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
  status,
  action,
  className,
  tone = "billing",
  id,
  children,
}: {
  icon: PortalIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Status chip shown immediately beside the title. */
  status?: ReactNode;
  /** Rendered to the right of the header (e.g. a compact status badge). */
  action?: ReactNode;
  className?: string;
  tone?: PortalCardTone;
  id?: string;
  children: ReactNode;
}) {
  const muted = tone === "muted";
  return (
    <section
      id={id}
      className={`rounded-2xl border p-4 sm:p-7 ${
        muted
          ? "border-dashed border-white/10 bg-white/2.5"
          : tone === "billing"
            ? "border-white/10 bg-surface transition-colors hover:border-white/20"
            : `${SERVICE_THEME[tone].card} bg-surface transition-colors`
      } ${id ? "scroll-mt-[calc(var(--site-header-height)+1rem)]" : ""} ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <PortalCardIcon icon={icon} tone={tone} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                className={`text-lg font-bold leading-snug tracking-tight sm:text-xl ${
                  muted ? "text-white/70" : "text-white"
                }`}
              >
                {title}
              </h2>
              {status}
            </div>
            {description && (
              <p className={`mt-1 text-[13px] leading-relaxed ${muted ? "text-white/35" : "text-white/50"}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}
