import { createPortalServerClient } from "@/lib/portal/supabase/server";
import { ResolveAlertButton } from "@/components/admin-portal/resolve-alert-button";
import type { Tables } from "@/lib/portal/database.types";

const KIND_LABELS: Record<string, string> = {
  email_failure: "An email didn't send",
  cron_failure: "An automatic task didn't finish",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function contextSummary(context: Tables<"portal_alerts">["context"]): string | null {
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const entries = Object.entries(context).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join("  ·  ");
}

/**
 * Alerts tab (PORTAL_PLAN.md Phase 7, handover 22.3): operational failures
 * (undelivered emails, failed cron runs) surfaced where an admin will see
 * them, with a resolve stamp for triage. Empty tab = healthy system.
 */
export async function AdminAlerts() {
  const supabase = await createPortalServerClient();
  const [openResult, resolvedResult] = await Promise.all([
    supabase
      .from("portal_alerts")
      .select("*")
      .is("resolved_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("portal_alerts")
      .select("*")
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(20),
  ]);

  if (openResult.error || resolvedResult.error) {
    console.error("[portal] alerts query failed:", openResult.error ?? resolvedResult.error);
    throw new Error("Alerts failed to load.");
  }

  const open = openResult.data ?? [];
  const resolved = resolvedResult.data ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-surface p-6">
        <h2 className="text-lg font-bold text-white">
          Open alerts {open.length > 0 && <span className="text-amber-300">({open.length})</span>}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          If the system tries to send an email (an invoice reminder, an
          invitation, a contact-list notice) and it doesn&apos;t go through, it
          shows up here so nothing slips past you. Once you&apos;ve handled one
          (say, you phoned the client instead), mark it resolved.
        </p>
        {open.length === 0 ? (
          <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
            Nothing needs your attention. Everything the system was supposed to
            send went out.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {open.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-200">
                    {KIND_LABELS[alert.kind] ?? alert.kind}
                    <span className="ml-2 font-normal text-white/40">{formatWhen(alert.created_at)}</span>
                  </p>
                  <p className="mt-1 text-sm text-white/80">{alert.message}</p>
                  {contextSummary(alert.context) && (
                    <p className="mt-1 break-all text-xs text-white/45">{contextSummary(alert.context)}</p>
                  )}
                </div>
                <ResolveAlertButton alertId={alert.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-surface p-6">
          <h2 className="text-lg font-bold text-white">Recently resolved</h2>
          <ul className="mt-4 space-y-2">
            {resolved.map((alert) => (
              <li key={alert.id} className="rounded-xl border border-white/5 bg-black/20 px-4 py-2.5">
                <p className="text-sm text-white/60">
                  <span className="font-bold text-white/75">{KIND_LABELS[alert.kind] ?? alert.kind}</span>
                  {" · "}
                  {alert.message}
                  <span className="ml-2 text-xs text-white/35">
                    resolved {alert.resolved_at ? formatWhen(alert.resolved_at) : ""}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
