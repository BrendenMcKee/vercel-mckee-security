import type { Tables } from "@/lib/portal/database.types";
import {
  SERVICE_STATUS_LABELS,
  type ServiceStatus,
} from "@/lib/portal/service-labels";

export const adminInputClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";

/** For <select> elements: custom chevron inset from the right edge. */
export const adminSelectClass = `${adminInputClass} select-chevron cursor-pointer`;

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

/** Amber for needs-money states, muted for ended states (handover 14: not brand red). */
export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const styles: Record<ServiceStatus, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    unpaid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    paused: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    cancelled: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status]}`}>
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}
