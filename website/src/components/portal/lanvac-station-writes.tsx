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
  formatOnTestRemaining,
  formatStationDateTime,
  isCarbonMonoxideZoneType,
  mapZoneTypeToWrite,
  minutesFromDaysAndHours,
  onTestDurationLabel,
  onTestPresetLabel,
  zoneWriteTypeLabel,
  type ProvenZoneWriteType,
} from "@/lib/portal/lanvac-writes";
import type { LanvacStationZone } from "@/components/portal/lanvac-station-readout";

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
        <p className="text-sm text-white/45">{STATION_WRITES_NOT_LIVE}</p>
      )}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}
      {!accountOnTest && (
        <DurationPicker
          minutes={minutes}
          onChange={setMinutes}
          onValidChange={setDurationOk}
          disabled={!writesLive || pending}
        />
      )}
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold tracking-tight text-white">Change zones</p>
        <button type="button" onClick={openCreate} className={buttonClass}>
          Add zone
        </button>
      </div>
      <p className="text-sm leading-relaxed text-white/55">
        Add a new unused zone number, or delete one. Edit is only for zones this
        portal created, because the station does not send delay or call-list
        settings back. Guessing those on a pulled zone would overwrite what is
        already at the station. Carbon monoxide types cannot be written yet.
      </p>
      {!writesLive && <p className="text-sm text-white/45">{STATION_WRITES_NOT_LIVE}</p>}
      {notice && <p className="text-sm text-amber-100">{notice}</p>}

      {editing != null && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-background p-4">
          <p className="text-sm text-white/70">
            {editing === "new" ? "New zone" : `Edit zone #${form.zoneNumber}`}.
            Delay, call list, and optional codes are stored here after a portal
            create so later edits do not invent defaults.
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
          const canEdit = !carbon && Boolean(zone.write);
          const blockedReason = carbon
            ? "Carbon monoxide type cannot be changed yet."
            : !zone.write
              ? "Pulled from the station. Delay and call-list settings are not on file, so this one cannot be edited."
              : null;
          return (
            <li
              key={zone.zoneNumber}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm text-white/75"
            >
              <span className="min-w-0">
                <span className="text-white/90">
                  #{zone.zoneNumber} {zone.description || "Not on file"}
                </span>
                {blockedReason && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/45">
                    {blockedReason}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-2">
                {canEdit && (
                  <button type="button" onClick={() => openEdit(zone)} className={buttonClass}>
                    Edit
                  </button>
                )}
                <button type="button" onClick={() => remove(zone)} className={buttonClass}>
                  Delete
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
