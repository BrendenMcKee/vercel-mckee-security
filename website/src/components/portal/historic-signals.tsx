"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadMoreLanvacHistoricAction } from "@/lib/portal/actions/lanvac-station";
import {
  HISTORIC_FILTERS,
  LANVAC_HISTORIC_MAX_PAGES,
  LANVAC_HISTORIC_PAGE_SIZE,
  filterHistoricEvents,
  groupHistoricEventsByDay,
  historicEventTone,
  historicFilterChipTone,
  historicKindLabel,
  presentHistoricSignals,
  type HistoricEvent,
  type HistoricFilterId,
  type HistoricKind,
  type HistoricZoneHint,
} from "@/lib/portal/lanvac-historic";
import type { LanvacStationSignal } from "@/components/portal/lanvac-station-readout";
import { StationPullingNotice } from "@/components/portal/station-pulling-notice";

const EMPTY_ZONES: HistoricZoneHint[] = [];

function KindIcon({ kind, className = "h-4 w-4 shrink-0" }: { kind: HistoricKind; className?: string }) {
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
    case "call_list":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "dispatch":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 4.8c0-.4.4-.8.8-.8h2.3c.4 0 .8.3.9.7l.7 2.4c.1.4 0 .8-.3 1.1L8.4 9.2a12 12 0 005.4 5.4l1-1c.3-.3.7-.4 1.1-.3l2.4.7c.4.1.7.5.7.9v2.3c0 .4-.4.8-.8.8C10.4 19 5 13.6 5 4.8z"
          />
        </svg>
      );
    case "override":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
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
  const kindLabel = historicKindLabel(event.kind);
  const showKind = event.title.toLowerCase() !== kindLabel.toLowerCase();

  return (
    <li className={`rounded-xl border px-3 py-2 text-sm text-white/80 ${historicEventTone(event.kind)}`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-current" aria-hidden>
          <KindIcon kind={event.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold leading-snug text-white">{event.title}</p>
              {showKind && (
                <p className="mt-0.5 text-xs font-medium text-white/55">{kindLabel}</p>
              )}
            </div>
            <p
              className="shrink-0 pt-0.5 text-right text-xs tabular-nums text-white/60"
              title={event.whenLabel}
            >
              {event.timeLabel}
            </p>
          </div>
          {event.summary && <p className="mt-1 text-sm leading-snug text-white/70">{event.summary}</p>}
          {event.details.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-sm leading-snug text-white/60">
              {event.details.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          )}
          {variant === "admin" && event.signals.length > 0 && (
            <p className="mt-1 text-xs text-white/35">{event.signals.join(" · ")}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function EventTypeFilters({
  filter,
  events,
  onChange,
}: {
  filter: HistoricFilterId;
  events: HistoricEvent[];
  onChange: (next: HistoricFilterId) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const chips = HISTORIC_FILTERS.filter((item) => {
    if (item.id === "all") return true;
    return events.some((event) => event.kind === item.id);
  });

  function updateOverflow() {
    const node = scrollerRef.current;
    if (!node) return;
    const left = node.scrollLeft > 4;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 4;
    setOverflow((current) =>
      current.left === left && current.right === right ? current : { left, right },
    );
  }

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    updateOverflow();
    node.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", updateOverflow);
      observer.disconnect();
    };
  }, [chips.length]);

  function scrollBy(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  }

  return (
    <div>
      <p className="text-sm font-semibold text-white">Event type</p>
      <div className="relative mt-1.5">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1.5 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25"
        >
          {chips.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(item.id)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${historicFilterChipTone(item.id, active)}`}
              >
                {item.id !== "all" && (
                  <KindIcon kind={item.id} className="h-3.5 w-3.5 shrink-0" />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
        {overflow.left && (
          <button
            type="button"
            aria-label="Earlier event types"
            onClick={() => scrollBy(-1)}
            className="absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center bg-linear-to-r from-background via-background/80 to-transparent text-white/70"
          >
            ‹
          </button>
        )}
        {overflow.right && (
          <button
            type="button"
            aria-label="More event types"
            onClick={() => scrollBy(1)}
            className="absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center bg-linear-to-l from-background via-background/80 to-transparent text-white/70"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

function DayFilter({
  value,
  days,
  onChange,
}: {
  value: string;
  days: Array<[string, string]>;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const listId = useId();
  const selected = value === "all" ? "All days" : days.find(([key]) => key === value)?.[1] ?? "All days";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative max-w-md">
      <p id={labelId} className="text-sm font-semibold text-white">Date</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="mt-1.5 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-background px-3 text-left text-sm text-white outline-none hover:border-white/30 focus:border-primary"
      >
        <span className="truncate">{selected}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-surface p-1 shadow-xl"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === "all"}
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm ${
                value === "all" ? "bg-primary/20 text-white" : "text-white/80 hover:bg-white/5"
              }`}
            >
              All days
            </button>
          </li>
          {days.map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                role="option"
                aria-selected={value === key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm ${
                  value === key ? "bg-primary/20 text-white" : "text-white/80 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HistoricSignals({
  profileId,
  canLoadMore,
  variant,
  signals,
  zones,
  pulling,
}: {
  profileId: string;
  canLoadMore: boolean;
  variant: "admin" | "client";
  signals: LanvacStationSignal[];
  zones?: HistoricZoneHint[];
  pulling?: boolean;
}) {
  const zoneHints = zones ?? EMPTY_ZONES;
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

  const events = useMemo(
    () => presentHistoricSignals(signals, { zones: zoneHints }),
    [signals, zoneHints],
  );
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
    if (filter !== "all" && !events.some((event) => event.kind === filter)) {
      setFilter("all");
    }
  }, [filter, events]);

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

  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight text-white">Historic Signals</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/55">
        Recent events from the monitoring station. An empty log does not mean
        the system is clear.
      </p>

      {signals.length > 0 && (
        <div className="mt-4 space-y-4">
          <DayFilter value={dayKey} days={days} onChange={setDayKey} />
          <EventTypeFilters filter={filter} events={events} onChange={setFilter} />
        </div>
      )}

      {notice && (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      )}

      {signals.length === 0 ? (
        pulling ? (
          <StationPullingNotice label="Loading signals from the monitoring station." />
        ) : (
        <p className="mt-3 text-sm text-white/45">No signals on file.</p>
        )
      ) : (
        <div
          ref={listRef}
          tabIndex={0}
          role="region"
          aria-label="Historic Signals"
          className="mt-4 max-h-[min(32rem,70vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-background/40 px-3 py-3 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.22)_transparent] sm:px-4 sm:py-4 lg:max-h-[min(48rem,80vh)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25"
        >
          {visible.length === 0 ? (
            <p className="px-1 py-2 text-sm text-white/45">
              No events match those filters
              {hasMore ? ". Load older signals to look further back." : "."}
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map((day, index) => (
                <section
                  key={day.dayKey}
                  aria-labelledby={`historic-day-${day.dayKey}`}
                  className={index === 0 ? "pt-1" : "border-t border-white/15 pt-5"}
                >
                  <h4
                    id={`historic-day-${day.dayKey}`}
                    className="px-1 pb-3 text-base font-semibold tracking-tight text-white"
                  >
                    {day.dayLabel}
                  </h4>
                  <ul className="space-y-1.5">
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
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
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
