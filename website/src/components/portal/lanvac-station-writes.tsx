"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteLanvacZoneAction,
  setLanvacAccountTestAction,
  upsertLanvacZoneAction,
} from "@/lib/portal/actions/lanvac-station";
import {
  LANVAC_ON_TEST_DEFAULT_MINUTES,
  LANVAC_ON_TEST_MINUTES,
  LANVAC_ZONE_DESCRIPTION_MAX,
  PROVEN_ZONE_WRITE_TYPES,
  STATION_WRITES_NOT_LIVE,
  STATION_WRITES_NOT_LIVE_DETAIL,
  formatOnTestRemaining,
  formatStationDateTime,
  mapZoneTypeToWrite,
  minutesFromDaysAndHours,
  onTestDurationLabel,
  onTestPresetLabel,
  unusedZoneNumbers,
  zoneOccupiedMessage,
  zoneWriteTypeLabel,
  type ProvenZoneWriteType,
} from "@/lib/portal/lanvac-writes";
import type { LanvacStationZone } from "@/components/portal/lanvac-station-readout";
import { StationPullingNotice } from "@/components/portal/station-pulling-notice";

const inputClass =
  "min-h-11 rounded-xl border border-white/15 bg-background px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary";
const buttonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
const startTestButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-primary/50 bg-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary/20";

function DurationPicker({
  minutes,
  onChange,
  onValidChange,
  disabled,
}: {
  minutes: number;
  onChange: (value: number) => void;
  onValidChange?: (ok: boolean) => void;
  disabled?: boolean;
}) {
  const [customDays, setCustomDays] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [customActive, setCustomActive] = useState(false);

  function setValid(ok: boolean, error: string | null) {
    setCustomError(error);
    onValidChange?.(ok);
  }

  function applyCustom(nextDays: string, nextHours: string) {
    setCustomActive(true);
    setCustomDays(nextDays);
    setCustomHours(nextHours);
    const days = nextDays.trim() === "" ? 0 : Number(nextDays);
    const hours = nextHours.trim() === "" ? 0 : Number(nextHours);
    if (!Number.isFinite(days) || !Number.isFinite(hours) || days < 0 || hours < 0) {
      setValid(false, "Enter days and hours as numbers.");
      return;
    }
    if (days === 0 && hours === 0) {
      setValid(true, null);
      return;
    }
    const next = minutesFromDaysAndHours(days, hours);
    if (next == null) {
      setValid(false, "Choose between 1 hour and 2 days 12 hours.");
      return;
    }
    setValid(true, null);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {LANVAC_ON_TEST_MINUTES.map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={!customActive && minutes === value}
            onClick={() => {
              setCustomActive(false);
              setCustomDays("");
              setCustomHours("");
              setValid(true, null);
              onChange(value);
            }}
            className={`${buttonClass} ${
              !customActive && minutes === value
                ? "border-primary bg-primary/45 text-white"
                : ""
            }`}
          >
            {onTestPresetLabel(value)}
          </button>
        ))}
      </div>
      <div className="pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">
          Custom
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Days
            <input
              type="number"
              min={0}
              max={2}
              inputMode="numeric"
              disabled={disabled}
              value={customDays}
              placeholder="0"
              onChange={(event) => applyCustom(event.target.value, customHours)}
              className={`${inputClass} w-24`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Hours
            <input
              type="number"
              min={0}
              max={60}
              inputMode="numeric"
              disabled={disabled}
              value={customHours}
              placeholder="0"
              onChange={(event) => applyCustom(customDays, event.target.value)}
              className={`${inputClass} w-24`}
            />
          </label>
          {customActive && !customError && (
            <p className="pb-2 text-xs text-white/45">{onTestDurationLabel(minutes)}</p>
          )}
        </div>
      </div>
      {customError && <p className="text-sm text-amber-100">{customError}</p>}
    </div>
  );
}

export function StationOnTestControls({
  profileId,
  writesLive,
  onTestUntil,
  now,
}: {
  profileId: string;
  writesLive: boolean;
  onTestUntil: string | null;
  now: Date;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(LANVAC_ON_TEST_DEFAULT_MINUTES);
  const [durationOk, setDurationOk] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const until = onTestUntil ? new Date(onTestUntil) : null;
  const accountOnTest = Boolean(until && !Number.isNaN(until.getTime()) && until > now);
  const canStart = writesLive && !pending && !accountOnTest && durationOk;
  const canEnd = writesLive && !pending && accountOnTest;

  function run(onTest: boolean) {
    if (!writesLive) {
      setNotice(STATION_WRITES_NOT_LIVE);
      return;
    }
    if (onTest && accountOnTest) return;
    if (!onTest && !accountOnTest) return;
    if (onTest && !window.confirm(`Put this system on test for ${onTestDurationLabel(minutes)}?`)) {
      return;
    }
    if (!onTest && !window.confirm("Take this system off test and put it back in service?")) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await setLanvacAccountTestAction({
        profileId,
        onTest,
        minutes: onTest ? minutes : undefined,
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-background p-4">
      <h3 className="text-lg font-semibold tracking-tight text-white">
        Put Account on Test
      </h3>
      <p className="text-sm leading-relaxed text-white/55">
        Use this before you service the system or trip a sensor on purpose. The
        station still receives the signals but will not call your list or
        dispatch police or fire. The system stays armed. It comes off test when
        the time ends, or when you end it here.
      </p>
      <p className={`text-sm ${accountOnTest ? "text-amber-100" : "text-emerald-200/90"}`}>
        {accountOnTest && until
          ? `This system is on test until ${formatStationDateTime(until)} · ${formatOnTestRemaining(until, now)}.`
          : "This system is off test."}
      </p>
      {!writesLive && (
        <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
          {STATION_WRITES_NOT_LIVE_DETAIL}
        </p>
      )}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}
      {writesLive && !accountOnTest && (
        <DurationPicker
          minutes={minutes}
          onChange={setMinutes}
          onValidChange={setDurationOk}
          disabled={pending}
        />
      )}
      {writesLive && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canStart}
            onClick={() => run(true)}
            className={startTestButtonClass}
          >
            {pending && !accountOnTest ? "Working..." : "Put Account on Test"}
          </button>
          <button
            type="button"
            disabled={!canEnd}
            onClick={() => run(false)}
            className={buttonClass}
          >
            {pending && accountOnTest ? "Working..." : "End account test"}
          </button>
        </div>
      )}
    </div>
  );
}

function defaultWriteType(zoneType: string): ProvenZoneWriteType {
  const mapped = mapZoneTypeToWrite(zoneType);
  return mapped.ok ? mapped.code : "BUR";
}

function nextUnusedZoneNumber(zones: LanvacStationZone[]): number {
  return unusedZoneNumbers(zones.map((zone) => zone.zoneNumber))[0] ?? 1;
}

function canEditZone(zone: LanvacStationZone): boolean {
  return mapZoneTypeToWrite(zone.zoneType).ok;
}

function occupiedZone(zones: LanvacStationZone[], zoneNumber: number): LanvacStationZone | undefined {
  return zones.find((zone) => zone.zoneNumber === zoneNumber);
}

export function AdminZoneEditor({
  profileId,
  writesLive,
  zones,
  canRefresh,
  pulling,
  showEquipmentNote,
}: {
  profileId: string;
  writesLive: boolean;
  zones: LanvacStationZone[];
  canRefresh: boolean;
  pulling?: boolean;
  showEquipmentNote?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({
    zoneNumber: 1,
    description: "",
    zoneType: "BUR" as ProvenZoneWriteType,
  });
  const unusedNumbers = unusedZoneNumbers(zones.map((zone) => zone.zoneNumber));

  function openCreate() {
    setEditing("new");
    setForm({
      zoneNumber: nextUnusedZoneNumber(zones),
      description: "",
      zoneType: "BUR",
    });
    setNotice(null);
  }

  function openEdit(zone: LanvacStationZone) {
    setEditing(zone.zoneNumber);
    setForm({
      zoneNumber: zone.zoneNumber,
      description: zone.description.slice(0, LANVAC_ZONE_DESCRIPTION_MAX),
      zoneType: defaultWriteType(zone.zoneType),
    });
    setNotice(null);
  }

  function save() {
    if (!writesLive) {
      setNotice(STATION_WRITES_NOT_LIVE);
      return;
    }
    if (editing === "new") {
      const taken = occupiedZone(zones, form.zoneNumber);
      if (taken) {
        const message = zoneOccupiedMessage(form.zoneNumber, taken.description);
        setNotice(message);
        window.alert(message);
        return;
      }
    }
    if (!window.confirm(`Write zone #${form.zoneNumber} to the station?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await upsertLanvacZoneAction({
        profileId,
        zoneNumber: form.zoneNumber,
        description: form.description,
        zoneType: form.zoneType,
        mode: editing === "new" ? "create" : "update",
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(zone: LanvacStationZone) {
    const label = zone.description.trim() || "this zone";
    if (!window.confirm(`Delete zone #${zone.zoneNumber} ${label} from the station?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteLanvacZoneAction({
        profileId,
        zoneNumber: zone.zoneNumber,
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-white">Zones</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            These are the zones the monitoring station has on file. You can add
            an unused number, change a name or type, or delete one. Carbon
            monoxide types cannot be changed yet.
          </p>
          {showEquipmentNote && (
            <p className="mt-2 text-sm text-white/45">Equipment list below.</p>
          )}
        </div>
        {writesLive && (
          <button
            type="button"
            onClick={openCreate}
            disabled={unusedNumbers.length === 0}
            className={buttonClass}
          >
            Add zone
          </button>
        )}
      </div>
      {!writesLive && (
        <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
          {STATION_WRITES_NOT_LIVE_DETAIL}
        </p>
      )}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}

      {editing != null && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-background p-4">
          <p className="text-sm text-white/70">
            {editing === "new" ? `New zone #${form.zoneNumber}.` : `Edit zone #${form.zoneNumber}.`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/50">
              Zone number
              {editing === "new" ? (
                <select
                  value={form.zoneNumber}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    const taken = occupiedZone(zones, next);
                    if (taken) {
                      window.alert(zoneOccupiedMessage(next, taken.description));
                      return;
                    }
                    setForm((current) => ({ ...current, zoneNumber: next }));
                  }}
                  className={`${inputClass} mt-1 w-full`}
                >
                  {unusedNumbers.map((number) => (
                    <option key={number} value={number}>
                      {number}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  disabled
                  value={form.zoneNumber}
                  className={`${inputClass} mt-1 w-full`}
                />
              )}
            </label>
            <label className="text-xs text-white/50">
              Type
              <select
                value={form.zoneType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    zoneType: event.target.value as ProvenZoneWriteType,
                  }))
                }
                className={`${inputClass} mt-1 w-full`}
              >
                {PROVEN_ZONE_WRITE_TYPES.map((code) => (
                  <option key={code} value={code}>
                    {zoneWriteTypeLabel(code)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-xs text-white/50">
              Description
              <input
                value={form.description}
                maxLength={LANVAC_ZONE_DESCRIPTION_MAX}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || !writesLive} onClick={save} className={buttonClass}>
              {pending ? "Saving..." : "Save zone"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className={buttonClass}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {zones.length === 0 ? (
        pulling ? (
          <StationPullingNotice label="Loading zones from the monitoring station." />
        ) : (
        <p className="text-sm text-white/45">
          {canRefresh
            ? "No zones pulled yet. Use Refresh now."
            : "No zones on file."}
        </p>
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/45">
                <th className="px-3 py-2.5 font-bold">Zone #</th>
                <th className="border-l border-white/10 px-3 py-2.5 font-bold">Description</th>
                <th className="border-l border-white/10 px-3 py-2.5 font-bold">Type</th>
                {writesLive && (
                  <th className="border-l border-white/10 px-3 py-2.5 font-bold">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
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
                  {writesLive && (
                    <td className="border-l border-white/10 px-3 py-2.5">
                      <span className="flex flex-wrap justify-end gap-2">
                        {canEditZone(zone) && (
                          <button
                            type="button"
                            onClick={() => openEdit(zone)}
                            className={buttonClass}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(zone)}
                          className={buttonClass}
                        >
                          Delete
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
