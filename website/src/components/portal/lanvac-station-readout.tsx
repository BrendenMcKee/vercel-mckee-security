"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshLanvacStationAction } from "@/lib/portal/actions/lanvac-station";
import { type LanvacSignalClass } from "@/lib/portal/lanvac-signals";
import {
  formatOnTestRemaining,
  formatStationDateTime,
  lastHistoricOnTestText,
} from "@/lib/portal/lanvac-writes";
import {
  AdminZoneEditor,
  StationOnTestControls,
} from "@/components/portal/lanvac-station-writes";
import { HistoricSignals } from "@/components/portal/historic-signals";

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
const STATUS_TICK_MS = 15_000;

function parseOnTestUntil(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSyncedAt(iso: string | null): string | null {
  const date = parseOnTestUntil(iso);
  return date ? formatStationDateTime(date) : null;
}

function useNowTick(ms = STATUS_TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

function StationTestStatus({
  onTestUntil,
  isDisabled,
  signals,
  now,
}: {
  onTestUntil: string | null;
  isDisabled: boolean;
  signals: LanvacStationSignal[];
  now: Date;
}) {
  const until = parseOnTestUntil(onTestUntil);
  const accountOnTest = Boolean(until && until > now);
  const lastEnded = until && until <= now ? until : null;
  const historic = lastHistoricOnTestText(signals);

  return (
    <div
      className={`rounded-xl border px-3 py-3 sm:px-4 ${
        accountOnTest
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-emerald-500/25 bg-emerald-500/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
            accountOnTest
              ? "bg-amber-500/20 text-amber-100"
              : "bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {accountOnTest ? "On Test" : "Off Test"}
        </span>
        {isDisabled && (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white/60">
            Station disabled
          </span>
        )}
      </div>
      {accountOnTest && until && (
        <p className="mt-2 text-sm text-amber-100">
          Until {formatStationDateTime(until)} · {formatOnTestRemaining(until, now)}
        </p>
      )}
      {!accountOnTest && lastEnded && (
        <p className="mt-2 text-sm text-white/60">
          Last on test ended {formatStationDateTime(lastEnded)}
        </p>
      )}
      {!accountOnTest && !lastEnded && historic && (
        <p className="mt-2 text-sm text-white/60">Last on-test signal {historic}</p>
      )}
    </div>
  );
}

export function LanvacStationReadout({
  profileId,
  canRefresh,
  variant,
  writesLive,
  state,
  zones,
  signals,
  showEquipmentNote = false,
}: {
  profileId: string;
  canRefresh: boolean;
  variant: "admin" | "client";
  writesLive: boolean;
  state: LanvacStationState | null;
  zones: LanvacStationZone[];
  signals: LanvacStationSignal[];
  showEquipmentNote?: boolean;
}) {
  const router = useRouter();
  const now = useNowTick();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const pulledOnce = useRef(false);
  const pendingRef = useRef(false);

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
      <StationTestStatus
        onTestUntil={state?.onTestUntil ?? null}
        isDisabled={state?.isDisabled ?? false}
        signals={signals}
        now={now}
      />

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
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Refreshing..." : "Refresh now"}
          </button>
          {synced && <p className="text-xs text-white/40">Last pulled {synced}</p>}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-white">Zones</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          These are the zones the monitoring station has on file for this
          security system.
        </p>
        {showEquipmentNote && (
          <p className="mt-2 text-sm text-white/45">Equipment list below.</p>
        )}
        {zones.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">
            {canRefresh
              ? "No zones pulled yet. Use Refresh now."
              : "No zones on file."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/45">
                  <th className="px-3 py-2.5 font-bold">Zone #</th>
                  <th className="border-l border-white/10 px-3 py-2.5 font-bold">Description</th>
                  <th className="border-l border-white/10 px-3 py-2.5 font-bold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {zones.map((zone) => (
                  <tr key={zone.zoneNumber} className="align-top text-white/80">
                    <td className="px-3 py-2.5 tabular-nums">{zone.zoneNumber}</td>
                    <td className="border-l border-white/10 px-3 py-2.5">
                      {zone.description || "Not on file"}
                    </td>
                    <td className="border-l border-white/10 px-3 py-2.5">
                      {zone.zoneType || "Not on file"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StationOnTestControls
        profileId={profileId}
        writesLive={writesLive}
        onTestUntil={state?.onTestUntil ?? null}
        now={now}
      />

      {variant === "admin" && (
        <AdminZoneEditor profileId={profileId} writesLive={writesLive} zones={zones} />
      )}

      <HistoricSignals
        profileId={profileId}
        canLoadMore={canRefresh}
        variant={variant}
        signals={signals}
        zones={zones}
      />
    </div>
  );
}
