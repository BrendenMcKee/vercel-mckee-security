"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshLanvacStationAction } from "@/lib/portal/actions/lanvac-station";
import {
  chipTone,
  signalRowTone,
  stationStatusChip,
  type LanvacSignalClass,
} from "@/lib/portal/lanvac-signals";
import {
  AdminZoneEditor,
  StationOnTestControls,
} from "@/components/portal/lanvac-station-writes";

export type LanvacStationZoneWrite = {
  delay: number;
  notifyList: string[];
  signalCode: string | null;
  restoreCode: string | null;
};

export type LanvacStationZone = {
  zoneNumber: number;
  description: string;
  zoneType: string;
  onTest: boolean;
  useCallList: boolean | null;
  write?: LanvacStationZoneWrite | null;
};

export type LanvacStationSignal = {
  occurredAtText: string;
  signal: string;
  description: string;
  signalClass: LanvacSignalClass;
};

export type LanvacStationState = {
  panelType: string;
  isDisabled: boolean;
  onTestUntil: string | null;
  lastSignalAt: string | null;
  lastSignalClass: LanvacSignalClass | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const REFRESH_MS = 45_000;

function formatSyncedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function callListLabel(value: boolean | null): string {
  if (value == null) return "Not on file";
  return value ? "Yes" : "No";
}

export function LanvacStationReadout({
  profileId,
  canRefresh,
  variant,
  writesLive,
  state,
  zones,
  signals,
}: {
  profileId: string;
  canRefresh: boolean;
  variant: "admin" | "client";
  writesLive: boolean;
  state: LanvacStationState | null;
  zones: LanvacStationZone[];
  signals: LanvacStationSignal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const pulledOnce = useRef(false);
  const pendingRef = useRef(false);

  const chip = stationStatusChip({
    isDisabled: state?.isDisabled ?? false,
    onTestUntil: state?.onTestUntil ?? null,
    anyZoneOnTest: zones.some((zone) => zone.onTest),
    lastSignalClass: state?.lastSignalClass ?? null,
    lastSignalAt: state?.lastSignalAt ?? null,
  });
  const synced = formatSyncedAt(state?.lastSyncedAt ?? null);
  const stale = Boolean(state?.lastError);

  function refresh() {
    if (!canRefresh || pendingRef.current) return;
    pendingRef.current = true;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await refreshLanvacStationAction({ profileId });
        if (!result.ok) {
          setNotice(result.error);
          if (result.stale) router.refresh();
          return;
        }
        router.refresh();
      } finally {
        pendingRef.current = false;
      }
    });
  }

  useEffect(() => {
    if (!canRefresh) return;
    if (!pulledOnce.current && !state?.lastSyncedAt && !state?.lastError) {
      pulledOnce.current = true;
      refresh();
    }
    const timer = window.setInterval(() => {
      refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
    // Interval is per open card. Do not reset it when lastSyncedAt changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRefresh, profileId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Panel</p>
          <p className="mt-1 text-sm text-white/85">
            {state?.panelType?.trim() ? state.panelType : "Not on file"}
          </p>
        </div>
        <span
          className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-bold ${chipTone(chip.kind)}`}
        >
          {chip.label}
        </span>
      </div>

      {stale && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Could not refresh the station
          {synced ? ` (last good pull ${synced})` : ""}. {state?.lastError}
        </p>
      )}
      {notice && !stale && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {notice}
        </p>
      )}

      {canRefresh && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Refreshing..." : "Refresh now"}
          </button>
          {synced && <p className="text-xs text-white/40">Last pulled {synced}</p>}
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Zones</p>
        <p className="mt-1 text-sm text-white/50">
          What the monitoring station has for this alarm. Batteries and smokes
          you replace are on the equipment list. Putting the alarm on test is
          the whole account, not one zone.
        </p>
        {zones.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">
            {canRefresh
              ? "No zones pulled yet. Use Refresh now."
              : "No zones on file."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-white/40">
                  <th className="py-2 pr-3 font-bold">#</th>
                  <th className="py-2 pr-3 font-bold">Description</th>
                  <th className="py-2 pr-3 font-bold">Type</th>
                  <th className="py-2 pr-3 font-bold">On test</th>
                  <th className="py-2 font-bold">
                    {variant === "client" ? "Uses your call list" : "Call list"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {zones.map((zone) => (
                  <tr key={zone.zoneNumber} className="align-top text-white/80">
                    <td className="py-2.5 pr-3 tabular-nums">{zone.zoneNumber}</td>
                    <td className="py-2.5 pr-3">{zone.description || "Not on file"}</td>
                    <td className="py-2.5 pr-3">{zone.zoneType || "Not on file"}</td>
                    <td className="py-2.5 pr-3">{zone.onTest ? "Yes" : "No"}</td>
                    <td className="py-2.5">{callListLabel(zone.useCallList)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StationOnTestControls
        profileId={profileId}
        variant={variant}
        writesLive={writesLive}
        onTestUntil={state?.onTestUntil ?? null}
        anyZoneOnTest={zones.some((zone) => zone.onTest)}
      />

      {variant === "admin" && (
        <AdminZoneEditor profileId={profileId} writesLive={writesLive} zones={zones} />
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">
          Historic signals
        </p>
        <p className="mt-1 text-sm text-white/50">
          A recent station log, not a live alarm console. Empty is not proof
          that everything is clear.
        </p>
        {signals.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No signals on file.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {signals.map((row, index) => (
              <li
                key={`${row.occurredAtText}-${row.signal}-${index}`}
                className={`rounded-xl border px-3 py-2.5 text-sm ${signalRowTone(row.signalClass)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{row.description || "Signal"}</p>
                  <p className="text-xs text-white/45">{row.occurredAtText}</p>
                </div>
                {variant === "admin" && row.signal && (
                  <p className="mt-1 text-xs text-white/40">{row.signal}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
