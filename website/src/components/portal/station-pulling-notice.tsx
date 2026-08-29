/** First station pull can take several seconds. Spinner, not a skeleton: the Security card layout is still moving. */
export function StationPullingNotice({ label }: { label: string }) {
  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/65"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
