import type { ReactNode } from "react";
import type { Tables } from "@/lib/portal/database.types";
import {
  SERVICE_STATUS_LABELS,
  type ServiceStatus,
} from "@/lib/portal/service-labels";

export const adminInputClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";

/** For <select> elements: custom chevron inset from the right edge. */
export const adminSelectClass = `${adminInputClass} select-chevron cursor-pointer`;

/** Amber chrome when a Clients filter is not the default, so staff can see it is on. */
export function adminFilterSelectClass(active: boolean): string {
  return active
    ? `${adminSelectClass} border-amber-400/55 bg-amber-500/10 text-amber-100`
    : adminSelectClass;
}

export function ProfileStatusBadge({ status }: { status: Tables<"profiles">["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    disabled: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

const STATUS_ICONS: Record<ServiceStatus, ReactNode> = {
  active: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  unpaid: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  paused: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M5.75 3A1.75 1.75 0 004 4.75v10.5c0 .966.784 1.75 1.75 1.75h1.5A1.75 1.75 0 009 15.25V4.75C9 3.784 8.216 3 7.25 3h-1.5zM12.75 3A1.75 1.75 0 0011 4.75v10.5c0 .966.784 1.75 1.75 1.75h1.5A1.75 1.75 0 0016 15.25V4.75C16 3.784 15.216 3 14.25 3h-1.5z" />
    </svg>
  ),
  cancelled: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.72 6.72a.75.75 0 011.06 0L10 8.94l2.22-2.22a.75.75 0 111.06 1.06L11.06 10l2.22 2.22a.75.75 0 11-1.06 1.06L10 11.06l-2.22 2.22a.75.75 0 01-1.06-1.06L8.94 10 6.72 7.78a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/** Amber for needs-money states, muted for ended states (handover 14: not brand red). */
export function ServiceStatusBadge({
  status,
  withIcon = false,
}: {
  status: ServiceStatus;
  withIcon?: boolean;
}) {
  const styles: Record<ServiceStatus, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    unpaid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    paused: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    cancelled: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {withIcon && STATUS_ICONS[status]}
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}
