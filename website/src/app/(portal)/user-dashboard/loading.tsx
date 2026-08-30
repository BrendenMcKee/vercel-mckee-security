import { PORTAL_SHELL_CLASS } from "@/lib/portal/shell";

/** Card skeletons while dashboard data loads (PORTAL_PLAN.md 7.1). */
export default function UserDashboardLoading() {
  return (
    <div className={`${PORTAL_SHELL_CLASS} animate-pulse py-10`}>
      <div className="h-4 w-56 rounded bg-white/10" />
      <div className="mt-3 h-9 w-72 rounded bg-white/10" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl border border-white/10 bg-surface" />
        ))}
        <div className="h-32 rounded-2xl border border-white/10 bg-surface md:col-span-2" />
      </div>
    </div>
  );
}
