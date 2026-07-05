/** Card skeletons while dashboard data loads (PORTAL_PLAN.md 7.1). */
export default function UserDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-10">
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
