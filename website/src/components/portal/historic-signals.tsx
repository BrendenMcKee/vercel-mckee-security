"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadMoreLanvacHistoricAction } from "@/lib/portal/actions/lanvac-station";
import {
  HISTORIC_FILTERS,
  LANVAC_HISTORIC_MAX_PAGES,
  LANVAC_HISTORIC_PAGE_SIZE,
  filterHistoricEvents,
  groupHistoricEventsByDay,
  historicEventTone,
  historicKindLabel,
  presentHistoricSignals,
  type HistoricEvent,
  type HistoricFilterId,
  type HistoricKind,
} from "@/lib/portal/lanvac-historic";
import type { LanvacStationSignal } from "@/components/portal/lanvac-station-readout";

function KindIcon({ kind }: { kind: HistoricKind }) {
  const className = "h-4 w-4 shrink-0";
  switch (kind) {
    case "alarm":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.7L2.8 18a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.7a2 2 0 00-3.4 0z" />
        </svg>
      );
    case "restore":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "on_test":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "off_test":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m8-4a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      );
    case "viewed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4V6zm0 0l8 7 8-7" />
        </svg>
      );
    case "open_close":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h7a2 2 0 002-2v-2m3-5h-8m8 0l-3-3m3 3l-3 3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function EventCard({
  event,
  variant,
}: {
  event: HistoricEvent;
  variant: "admin" | "client";
}) {
  return (
    <li className={`rounded-xl border px-3 py-3 text-sm text-white/85 ${historicEventTone(event.kind)}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-current" aria-hidden>
          <KindIcon kind={event.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white">{event.title}</p>
              {event.title !== historicKindLabel(event.kind) && (
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-white/45">
                  {historicKindLabel(event.kind)}
                </p>
              )}
            </div>
            <p className="shrink-0 text-xs tabular-nums text-white/50">{event.timeLabel}</p>
          </div>
          {event.summary && <p className="mt-1.5 text-sm text-white/70">{event.summary}</p>}
          {event.details.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-white/55">
              {event.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {variant === "admin" && event.signals.length > 0 && (
            <p className="mt-2 text-xs text-white/35">{event.signals.join(" · ")}</p>
          )}
        </div>
      </div>
    </li>
  );
}

export function HistoricSignals({
  profileId,
  canLoadMore,
  variant,
  signals,
}: {
  profileId: string;
  canLoadMore: boolean;
  variant: "admin" | "client";
  signals: LanvacStationSignal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<HistoricFilterId>("all");
  const [dayKey, setDayKey] = useState<string | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(false);
  const watchingAll = filter === "all" && dayKey === "all";
  const hasMore =
    canLoadMore &&
    !exhausted &&
    signals.length > 0 &&
    signals.length % LANVAC_HISTORIC_PAGE_SIZE === 0 &&
    signals.length < LANVAC_HISTORIC_PAGE_SIZE * LANVAC_HISTORIC_MAX_PAGES;

  const events = useMemo(() => presentHistoricSignals(signals), [signals]);
  const days = useMemo(
    () =>
      Array.from(new Map(events.map((event) => [event.dayKey, event.dayLabel])).entries()),
    [events],
  );
  const visible = useMemo(
    () => filterHistoricEvents(events, filter, dayKey),
    [events, filter, dayKey],
  );
  const grouped = useMemo(() => groupHistoricEventsByDay(visible), [visible]);

  function loadMore() {
    if (!canLoadMore || pendingRef.current || !hasMore) return;
    pendingRef.current = true;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await loadMoreLanvacHistoricAction({ profileId });
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
        if (!result.hasMore || result.added < LANVAC_HISTORIC_PAGE_SIZE) {
          setExhausted(true);
        }
        if (result.added > 0) router.refresh();
      } finally {
        pendingRef.current = false;
      }
    });
  }

  useEffect(() => {
    setExhausted(false);
  }, [profileId]);

  useEffect(() => {
    if (dayKey !== "all" && !days.some(([key]) => key === dayKey)) {
      setDayKey("all");
    }
  }, [dayKey, days]);

  useEffect(() => {
    if (!canLoadMore || !hasMore || !watchingAll) return;
    const node = endRef.current;
    const root = listRef.current;
    if (!node || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root, rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadMore, hasMore, watchingAll, profileId, signals.length]);

  const selectClass =
    "min-h-11 rounded-xl border border-white/15 bg-background px-3 text-sm text-white outline-none focus:border-primary";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">
        Historic signals
      </p>
      <p className="mt-1 text-sm text-white/50">
        Recent events from the monitoring station. An empty log does not mean
        the system is clear.
      </p>

      {signals.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40">
            Date
            <select
              value={dayKey}
              onChange={(event) => setDayKey(event.target.value)}
              className={`${selectClass} mt-1.5 w-full sm:max-w-xs`}
            >
              <option value="all">All days</option>
              {days.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {HISTORIC_FILTERS.filter((item) => {
              if (item.id === "all") return true;
              return events.some((event) => event.kind === item.id);
            }).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-wide ${
                  filter === item.id
                    ? "border-primary/50 bg-primary/15 text-white"
                    : "border-white/15 text-white/65 hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      )}

      {signals.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">No signals on file.</p>
      ) : (
        <div
          ref={listRef}
          tabIndex={0}
          role="region"
          aria-label="Historic signals"
          className="mt-4 max-h-[min(32rem,70vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-background/40 p-2 sm:p-3"
        >
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-sm text-white/45">
              No events match those filters
              {hasMore ? ". Load older signals to look further back." : "."}
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((day) => (
                <section key={day.dayKey} className="rounded-xl border border-white/10">
                  <h3 className="sticky top-0 z-10 border-b border-white/10 bg-surface/95 px-3 py-2 text-sm font-semibold text-white/70 backdrop-blur-sm">
                    {day.dayLabel}
                  </h3>
                  <ul className="space-y-2 p-2">
                    {day.events.map((event) => (
                      <EventCard key={event.id} event={event} variant={variant} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {canLoadMore && (hasMore || exhausted) && (
            <div ref={endRef} className="pt-3 text-center">
              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={pending}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-white/20 px-4 text-xs font-bold uppercase tracking-wide text-white/70 hover:bg-white/10 disabled:opacity-50"
                >
                  {pending ? "Loading older signals..." : "Load older signals"}
                </button>
              ) : (
                <p className="text-xs text-white/35">End of the loaded log</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
