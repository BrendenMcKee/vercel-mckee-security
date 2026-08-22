"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteLanvacZoneAction,
  setLanvacAccountTestAction,
  setLanvacZoneTestAction,
  upsertLanvacZoneAction,
} from "@/lib/portal/actions/lanvac-station";
import {
  LANVAC_ON_TEST_DEFAULT_MINUTES,
  LANVAC_ON_TEST_MINUTES,
  LANVAC_ZONE_DESCRIPTION_MAX,
  PROVEN_ZONE_WRITE_TYPES,
  STATION_WRITES_NOT_LIVE,
  isCarbonMonoxideZoneType,
  mapZoneTypeToWrite,
  zoneWriteTypeLabel,
  type ProvenZoneWriteType,
} from "@/lib/portal/lanvac-writes";
import type { LanvacStationZone } from "@/components/portal/lanvac-station-readout";

const inputClass =
  "rounded-xl border border-white/15 bg-background px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary";
const buttonClass =
  "cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50";

function DurationPicker({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (value: number) => void;
}) {
  const preset = (LANVAC_ON_TEST_MINUTES as readonly number[]).includes(minutes);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LANVAC_ON_TEST_MINUTES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`${buttonClass} ${minutes === value ? "border-sky-400/50 bg-sky-500/15 text-sky-100" : ""}`}
        >
          {value} min
        </button>
      ))}
      <label className="flex items-center gap-2 text-xs text-white/50">
        Custom
        <input
          type="number"
          min={5}
          max={3600}
          value={preset ? "" : minutes}
          placeholder="5-3600"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className={`${inputClass} w-24`}
        />
      </label>
    </div>
  );
}

export function StationOnTestControls({
  profileId,
  variant,
  writesLive,
  onTestUntil,
  anyZoneOnTest,
}: {
  profileId: string;
  variant: "admin" | "client";
  writesLive: boolean;
  onTestUntil: string | null;
  anyZoneOnTest: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(LANVAC_ON_TEST_DEFAULT_MINUTES);
  const [notice, setNotice] = useState<string | null>(null);
  const until = onTestUntil ? new Date(onTestUntil) : null;
  const accountOnTest = Boolean(until && !Number.isNaN(until.getTime()) && until > new Date());

  function run(onTest: boolean) {
    if (!writesLive) {
      setNotice(STATION_WRITES_NOT_LIVE);
      return;
    }
    if (onTest && !window.confirm(`Put this alarm on test for ${minutes} minutes?`)) return;
    if (!onTest && !window.confirm("Take this alarm off test and put it back in service?")) return;
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
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">
        {variant === "client" ? "Put the alarm on test" : "Account on test"}
      </p>
      <p className="text-sm text-white/50">
        {variant === "client"
          ? "This tells the station you are working on the system. It does not turn the alarm off."
          : "Account-level test. Per-zone test is on each zone row."}
      </p>
      {!writesLive && (
        <p className="text-sm text-white/45">{STATION_WRITES_NOT_LIVE}</p>
      )}
      {accountOnTest && until && (
        <p className="text-sm text-sky-100">
          On test until{" "}
          {until.toLocaleString("en-CA", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
      {anyZoneOnTest && !accountOnTest && (
        <p className="text-sm text-sky-100">At least one zone is on test.</p>
      )}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}
      <DurationPicker minutes={minutes} onChange={setMinutes} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || !writesLive} onClick={() => run(true)} className={buttonClass}>
          {pending ? "Working..." : "Start account test"}
        </button>
        <button type="button" disabled={pending || !writesLive} onClick={() => run(false)} className={buttonClass}>
          End account test
        </button>
      </div>
    </div>
  );
}

function defaultWriteType(zoneType: string): ProvenZoneWriteType {
  const mapped = mapZoneTypeToWrite(zoneType);
  return mapped.ok ? mapped.code : "BUR";
}

export function AdminZoneEditor({
  profileId,
  writesLive,
  zones,
}: {
  profileId: string;
  writesLive: boolean;
  zones: LanvacStationZone[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({
    zoneNumber: 1,
    description: "",
    zoneType: "BUR" as ProvenZoneWriteType,
    useCallList: true,
    delay: 1,
    notifyList: "",
    signalCode: "",
    restoreCode: "",
    reason: "",
    minutes: LANVAC_ON_TEST_DEFAULT_MINUTES,
  });

  function openCreate() {
    setEditing("new");
    setForm({
      zoneNumber: 1,
      description: "",
      zoneType: "BUR",
      useCallList: true,
      delay: 1,
      notifyList: "",
      signalCode: "",
      restoreCode: "",
      reason: "",
      minutes: LANVAC_ON_TEST_DEFAULT_MINUTES,
    });
    setNotice(null);
  }

  function openEdit(zone: LanvacStationZone) {
    setEditing(zone.zoneNumber);
    setForm({
      zoneNumber: zone.zoneNumber,
      description: zone.description.slice(0, LANVAC_ZONE_DESCRIPTION_MAX),
      zoneType: defaultWriteType(zone.zoneType),
      useCallList: zone.useCallList ?? true,
      delay: zone.write?.delay ?? 1,
      notifyList: (zone.write?.notifyList ?? []).join(", "),
      signalCode: zone.write?.signalCode ?? "",
      restoreCode: zone.write?.restoreCode ?? "",
      reason: "",
      minutes: LANVAC_ON_TEST_DEFAULT_MINUTES,
    });
    setNotice(null);
  }

  function save() {
    if (!writesLive) {
      setNotice(STATION_WRITES_NOT_LIVE);
      return;
    }
    if (!window.confirm(`Write zone #${form.zoneNumber} to the station?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await upsertLanvacZoneAction({
        profileId,
        zoneNumber: form.zoneNumber,
        description: form.description,
        zoneType: form.zoneType,
        useCallList: form.useCallList,
        delay: form.delay,
        notifyList: form.notifyList
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        signalCode: form.signalCode.toUpperCase(),
        restoreCode: form.restoreCode.toUpperCase(),
        reason: form.reason,
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
    const reason = window.prompt(`Why delete zone #${zone.zoneNumber}?`);
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(`Delete zone #${zone.zoneNumber} from the station?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteLanvacZoneAction({
        profileId,
        zoneNumber: zone.zoneNumber,
        reason: reason.trim(),
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function zoneTest(zone: LanvacStationZone, onTest: boolean) {
    if (!writesLive) {
      setNotice(STATION_WRITES_NOT_LIVE);
      return;
    }
    if (zone.zoneNumber > 100) {
      setNotice("Zones above 100 cannot be put on test.");
      return;
    }
    if (
      onTest &&
      !window.confirm(`Put zone #${zone.zoneNumber} on test for ${form.minutes} minutes?`)
    ) {
      return;
    }
    if (!onTest && !window.confirm(`Take zone #${zone.zoneNumber} off test?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setLanvacZoneTestAction({
        profileId,
        zoneNumber: zone.zoneNumber,
        onTest,
        minutes: onTest ? form.minutes : undefined,
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Zone writes</p>
        <button type="button" onClick={openCreate} className={buttonClass}>
          Add zone
        </button>
      </div>
      {!writesLive && <p className="text-sm text-white/45">{STATION_WRITES_NOT_LIVE}</p>}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}

      {editing != null && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-background p-4">
          <p className="text-sm text-white/70">
            {editing === "new" ? "New zone" : `Edit zone #${form.zoneNumber}`}. Edit is only for
            zones this portal already wrote (stored delay and call list). Do not PUT a pulled
            live zone from defaults. Carbon monoxide type cannot be written yet.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/50">
              Zone number
              <input
                type="number"
                min={1}
                max={999}
                disabled={editing !== "new"}
                value={form.zoneNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, zoneNumber: Number(event.target.value) }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
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
            <label className="text-xs text-white/50">
              Delay
              <input
                type="number"
                min={1}
                max={999}
                value={form.delay}
                onChange={(event) =>
                  setForm((current) => ({ ...current, delay: Number(event.target.value) }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.useCallList}
                onChange={(event) =>
                  setForm((current) => ({ ...current, useCallList: event.target.checked }))
                }
              />
              Use the caller ID list
            </label>
            <label className="sm:col-span-2 text-xs text-white/50">
              Extra notify phones or emails (comma, max 5)
              <input
                value={form.notifyList}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notifyList: event.target.value }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="text-xs text-white/50">
              Signal code (optional)
              <input
                value={form.signalCode}
                maxLength={6}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    signalCode: event.target.value.toUpperCase(),
                  }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="text-xs text-white/50">
              Restore code (optional)
              <input
                value={form.restoreCode}
                maxLength={6}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    restoreCode: event.target.value.toUpperCase(),
                  }))
                }
                className={`${inputClass} mt-1 w-full`}
              />
            </label>
            <label className="sm:col-span-2 text-xs text-white/50">
              Reason
              <input
                value={form.reason}
                maxLength={300}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
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

      <ul className="space-y-2">
        {zones.map((zone) => {
          const carbon = isCarbonMonoxideZoneType(zone.zoneType);
          return (
            <li
              key={zone.zoneNumber}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm text-white/75"
            >
              <span>
                #{zone.zoneNumber} {zone.description || "Not on file"}
                {carbon ? " (carbon monoxide: type locked)" : ""}
                {!carbon && !zone.write ? " (write fields unknown)" : ""}
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={carbon || !zone.write}
                  onClick={() => openEdit(zone)}
                  className={buttonClass}
                >
                  Edit
                </button>
                <button type="button" onClick={() => remove(zone)} className={buttonClass}>
                  Delete
                </button>
                {zone.zoneNumber <= 100 && (
                  <>
                    <button
                      type="button"
                      disabled={!writesLive}
                      onClick={() => zoneTest(zone, true)}
                      className={buttonClass}
                    >
                      Zone on test
                    </button>
                    <button
                      type="button"
                      disabled={!writesLive}
                      onClick={() => zoneTest(zone, false)}
                      className={buttonClass}
                    >
                      Zone off test
                    </button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
