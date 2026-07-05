/** Route-level skeleton while admin dashboard data loads (PORTAL_PLAN.md 7.2). */
export default function AdminDashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl animate-pulse px-4 py-12">
      <div className="h-4 w-48 rounded bg-white/10" />
      <div className="mt-3 h-9 w-72 rounded bg-white/10" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-white/10 bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-2xl border border-white/10 bg-surface" />
    </section>
  );
}
