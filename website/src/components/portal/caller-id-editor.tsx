"use client";

import { useEffect, useMemo, useState, useTransition, type PointerEvent } from "react";
import { formatPhone, normalizePhone } from "@/lib/portal/phone";
import {
  saveMyCallerIdList,
  saveClientCallerIdList,
  type SaveCallerIdResult,
} from "@/lib/portal/actions/caller-id";
import {
  CALLER_ID_CLIENT_COOLDOWN_SECONDS,
  callerIdWaitMessage,
} from "@/lib/portal/caller-id-wait";
import { LANVAC_CONTACT_NAME_MAX, LANVAC_PASSCODE_MAX } from "@/lib/portal/lanvac";

export type CallerIdContact = {
  id: string;
  phone: string;
  label: string;
  passcode: string | null;
};

const AUTHORIZATION_OPTIONS = [
  { value: "client_email", label: "Client emailed the request (preferred)" },
  { value: "client_verbal", label: "Client requested verbally (phone/site visit)" },
  { value: "client_in_person", label: "Client requested in person" },
  { value: "mckee_initiated", label: "McKee-initiated correction" },
] as const;

const inputClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";

const contactKey = (c: { phone: string; label: string; passcode?: string | null }) =>
  `${c.phone}|${c.label}|${c.passcode ?? ""}`;

function withStableIds(contacts: Array<Partial<CallerIdContact> & { phone: string; label: string; passcode: string | null }>): CallerIdContact[] {
  return contacts.map((contact, index) => ({
    id: contact.id ?? `tmp-${index}-${contact.phone}`,
    phone: contact.phone,
    label: contact.label,
    passcode: contact.passcode,
  }));
}

/**
 * Shared caller ID list editor (R23): the client dashboard and the admin
 * client-detail page render the same list UI and run the same save pipeline.
 * Every contact carries the passcode the monitoring station uses to verify
 * them. Existing people can be edited (name, number, passcode) before save.
 * The admin variant additionally requires an authorization method +
 * reason note (R24) and shows the exact diff in the confirm dialog before
 * saving.
 */
export function CallerIdEditor({
  variant,
  profileId,
  initialContacts,
}: {
  variant: "client" | "admin";
  /** Required for the admin variant. */
  profileId?: string;
  initialContacts: CallerIdContact[];
}) {
  const [contacts, setContacts] = useState<CallerIdContact[]>(() => withStableIds(initialContacts));
  const [baseline, setBaseline] = useState<CallerIdContact[]>(() => withStableIds(initialContacts));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPasscode, setEditPasscode] = useState("");
  const [authorizedVia, setAuthorizedVia] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error" | "wait"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (contacts.length !== baseline.length) return true;
    return contacts.some((contact, index) => {
      const saved = baseline[index];
      return !saved || contactKey(contact) !== contactKey(saved);
    });
  }, [contacts, baseline]);

  useEffect(() => {
    if (waitUntil == null || notice?.kind !== "wait") return;
    function tick() {
      if (waitUntil == null) return;
      const remaining = Math.ceil((waitUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setWaitUntil(null);
        setNotice({ kind: "ok", text: "You can save your list again now." });
        return;
      }
      setNotice({ kind: "wait", text: callerIdWaitMessage(remaining) });
    }
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [waitUntil, notice?.kind]);

  function parsedContact(
    labelRaw: string,
    phoneRaw: string,
    passcodeRaw: string,
    { requirePasscode }: { requirePasscode: boolean },
  ): { label: string; phone: string; passcode: string } | null {
    const label = labelRaw.trim();
    if (!label) {
      setNotice({ kind: "error", text: "Add the person's name first." });
      return null;
    }
    if (label.length > LANVAC_CONTACT_NAME_MAX) {
      setNotice({ kind: "error", text: `Name is too long (${LANVAC_CONTACT_NAME_MAX} max).` });
      return null;
    }
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      setNotice({ kind: "error", text: `"${phoneRaw}" is not a valid North American phone number.` });
      return null;
    }
    const passcode = passcodeRaw.trim();
    if (requirePasscode && !passcode) {
      setNotice({
        kind: "error",
        text: "Add this person's passcode. It's the word they give the monitoring station to confirm who they are.",
      });
      return null;
    }
    if (passcode.length > LANVAC_PASSCODE_MAX) {
      setNotice({ kind: "error", text: `Passcode is too long (${LANVAC_PASSCODE_MAX} max).` });
      return null;
    }
    return { label, phone, passcode };
  }

  function addContact() {
    setNotice(null);
    const parsed = parsedContact(newLabel, newPhone, newPasscode, { requirePasscode: true });
    if (!parsed) return;
    if (contacts.some((c) => contactKey(c) === contactKey(parsed))) {
      setNotice({ kind: "error", text: `${parsed.label} with that number and passcode is already on the list.` });
      return;
    }
    if (contacts.length >= 15) {
      setNotice({ kind: "error", text: "The list is capped at 15 contacts." });
      return;
    }
    setContacts((list) => [
      ...list,
      { id: crypto.randomUUID(), phone: parsed.phone, label: parsed.label, passcode: parsed.passcode },
    ]);
    setNewLabel("");
    setNewPhone("");
    setNewPasscode("");
  }

  function startEdit(contact: CallerIdContact) {
    setNotice(null);
    setEditingId(contact.id);
    setEditLabel(contact.label);
    setEditPhone(formatPhone(contact.phone));
    setEditPasscode(contact.passcode ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setEditPhone("");
    setEditPasscode("");
  }

  function contactsAfterEdit(): CallerIdContact[] | null {
    if (!editingId) return contacts;
    setNotice(null);
    const parsed = parsedContact(editLabel, editPhone, editPasscode, { requirePasscode: true });
    if (!parsed) return null;
    if (
      contacts.some(
        (c) => c.id !== editingId && contactKey(c) === contactKey(parsed),
      )
    ) {
      setNotice({ kind: "error", text: `${parsed.label} with that number and passcode is already on the list.` });
      return null;
    }
    return contacts.map((c) =>
      c.id === editingId
        ? { ...c, phone: parsed.phone, label: parsed.label, passcode: parsed.passcode }
        : c,
    );
  }

  function applyEdit(): boolean {
    const next = contactsAfterEdit();
    if (!next) return false;
    if (editingId) {
      setContacts(next);
      cancelEdit();
    }
    return true;
  }

  function removeContact(id: string) {
    setNotice(null);
    setContacts((list) => list.filter((c) => c.id !== id));
  }

  function setPasscode(id: string, passcode: string) {
    setNotice(null);
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, passcode } : c)));
  }

  function moveContact(id: string, toIndex: number) {
    setContacts((list) => {
      const from = list.findIndex((c) => c.id === id);
      if (from < 0 || toIndex < 0 || toIndex >= list.length || from === toIndex) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }

  function onDragHandlePointerDown(id: string, event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setNotice(null);
  }

  function onDragHandlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const row = el?.closest("[data-contact-id]") as HTMLElement | null;
    const overId = row?.dataset.contactId;
    if (!overId || overId === draggingId) return;
    setContacts((list) => {
      const from = list.findIndex((c) => c.id === draggingId);
      const to = list.findIndex((c) => c.id === overId);
      if (from < 0 || to < 0 || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function onDragHandlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
  }

  function describeDiff(list: CallerIdContact[] = contacts): string {
    const initial = new Set(baseline.map(contactKey));
    const next = new Set(list.map(contactKey));
    const added = list.filter((c) => !initial.has(contactKey(c)));
    const removed = baseline.filter((c) => !next.has(contactKey(c)));
    const line = (c: CallerIdContact, index: number) =>
      `#${index + 1} ${c.label}, ${formatPhone(c.phone)}${c.passcode ? `, passcode: ${c.passcode}` : ""}`;
    const moved = list.flatMap((c, index) => {
      const from = baseline.findIndex((entry) => contactKey(entry) === contactKey(c));
      if (from < 0 || from === index) return [];
      return [`~ ${line(c, index)} (was #${from + 1})`];
    });
    return [
      ...added.map((c) => `+ ${line(c, list.indexOf(c))}`),
      ...removed.map((c) => `- ${c.label}, ${formatPhone(c.phone)}`),
      ...moved,
    ].join("\n");
  }

  function save() {
    setNotice(null);
    const list = contactsAfterEdit();
    if (!list) return;
    if (editingId) {
      setContacts(list);
      cancelEdit();
    }

    if (variant === "client" && waitUntil != null && Date.now() < waitUntil) {
      setNotice({
        kind: "wait",
        text: callerIdWaitMessage(Math.ceil((waitUntil - Date.now()) / 1000)),
      });
      return;
    }

    const missingOnList = list.filter((c) => !c.passcode?.trim());
    if (missingOnList.length > 0) {
      setNotice({
        kind: "error",
        text: `Every contact needs a passcode before saving. Missing: ${missingOnList.map((c) => c.label).join(", ")}.`,
      });
      return;
    }

    if (variant === "admin") {
      if (!authorizedVia) {
        setNotice({ kind: "error", text: "Select how the client authorized this change before saving." });
        return;
      }
      if (changeReason.trim().length < 10) {
        setNotice({ kind: "error", text: "Describe the client's request (at least 10 characters) so the change can be verified later if questions come up." });
        return;
      }
      // R24: the exact diff is confirmed before an admin save commits.
      const confirmed = window.confirm(
        `Save these contact list changes on the client's behalf?\n\n${describeDiff(list)}\n\nThe client will be emailed these exact changes and the reason you recorded.`,
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const payload = list.map((c) => ({ phone: c.phone, label: c.label, passcode: c.passcode ?? "" }));
      let result: SaveCallerIdResult;
      if (variant === "admin") {
        result = await saveClientCallerIdList({
          profileId: profileId!,
          contacts: payload,
          authorizedVia,
          changeReason: changeReason.trim(),
        });
      } else {
        result = await saveMyCallerIdList({ contacts: payload });
      }

      if (!result.ok) {
        if (result.waitSeconds != null) {
          setWaitUntil(Date.now() + result.waitSeconds * 1000);
          setNotice({ kind: "wait", text: result.error });
          return;
        }
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (result.noChange) {
        setNotice({ kind: "ok", text: "No changes to save." });
        return;
      }
      setBaseline(list);
      if (variant === "client") {
        setWaitUntil(Date.now() + CALLER_ID_CLIENT_COOLDOWN_SECONDS * 1000);
      }
      const updatedCount = list.filter((c) => {
        const prev = baseline.find((b) => b.id === c.id);
        return prev != null && contactKey(prev) !== contactKey(c);
      }).length;
      const addedById = list.filter((c) => !baseline.some((b) => b.id === c.id)).length;
      const removedById = baseline.filter((b) => !list.some((c) => c.id === b.id)).length;
      const movedCount = result.reordered.length;
      const summaryBits = [
        addedById > 0 && `${addedById} added`,
        removedById > 0 && `${removedById} removed`,
        updatedCount > 0 && `${updatedCount} updated`,
        movedCount > 0 && `${movedCount} moved`,
      ].filter(Boolean);
      const parts = [
        movedCount > 0 && addedById === 0 && removedById === 0 && updatedCount === 0
          ? "Call order saved."
          : `List saved (${summaryBits.join(", ") || "changes stored"}).`,
        result.adminEmailSent
          ? "McKee has been notified and will update the monitoring station."
          : "Heads up: the notification email to McKee failed; please call to confirm the change was received.",
      ];
      if (variant === "admin") {
        parts.push(
          result.clientEmailSent
            ? "The client was emailed the changes and reason."
            : result.clientEmailPaused
              ? "Client notification email is held until go-live (Billing tab)."
              : "Client notification email did NOT send (no email on file or send failure). Notify them another way and note it.",
        );
        setAuthorizedVia("");
        setChangeReason("");
      }
      setNotice({ kind: "ok", text: parts.join(" ") });
    });
  }

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-200">
          No people on the list. The monitoring station needs at least one
          person to call when the alarm goes off. Police, fire, and ambulance
          are dispatched separately for the site&apos;s city. They are not
          added here.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            Call order
          </p>
          <p className="text-xs leading-relaxed text-white/40">
            Drag the handle to change who the station calls first. #1 is first.
          </p>
          <ul className="space-y-2">
          {contacts.map((contact, index) => {
            const isEditing = editingId === contact.id;
            return (
            <li
              key={contact.id}
              data-contact-id={contact.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-3 py-3 sm:px-4 ${
                draggingId === contact.id
                  ? "border-sky-400/50 bg-sky-500/10"
                  : isEditing
                    ? "border-sky-400/40 bg-sky-500/5"
                    : "border-white/10"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3.5">
                <button
                  type="button"
                  aria-label={`Reorder ${contact.label}. Currently #${index + 1}. Use arrow keys or drag.`}
                  disabled={pending || editingId != null}
                  onPointerDown={(event) => onDragHandlePointerDown(contact.id, event)}
                  onPointerMove={onDragHandlePointerMove}
                  onPointerUp={onDragHandlePointerUp}
                  onPointerCancel={onDragHandlePointerUp}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveContact(contact.id, index - 1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveContact(contact.id, index + 1);
                    }
                  }}
                  className="touch-none inline-flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
                >
                  <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 fill-current">
                    <rect x="4" y="5" width="12" height="1.8" rx="0.9" />
                    <rect x="4" y="9.1" width="12" height="1.8" rx="0.9" />
                    <rect x="4" y="13.2" width="12" height="1.8" rx="0.9" />
                  </svg>
                </button>
                <span
                  className={`w-8 shrink-0 text-sm font-bold tabular-nums text-white ${
                    isEditing ? "pt-2 sm:pt-0" : ""
                  }`}
                >
                  #{index + 1}
                </span>
                {isEditing ? (
                  <div
                    className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyEdit();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    }}
                  >
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-white/70">
                      Name / relation
                      <input
                        aria-label={`Name for contact #${index + 1}`}
                        maxLength={LANVAC_CONTACT_NAME_MAX}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className={`${inputClass} py-2!`}
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-white/70">
                      Phone number
                      <input
                        type="tel"
                        aria-label={`Phone for ${editLabel || contact.label}`}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className={`${inputClass} py-2!`}
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-white/70">
                      Passcode
                      <input
                        aria-label={`Passcode for ${editLabel || contact.label}`}
                        maxLength={LANVAC_PASSCODE_MAX}
                        value={editPasscode}
                        onChange={(e) => setEditPasscode(e.target.value)}
                        className={`${inputClass} py-2!`}
                      />
                    </label>
                  </div>
                ) : (
                <div className="min-w-0">
                  <p className="font-bold text-white">{contact.label}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
                    {formatPhone(contact.phone)}
                    {contact.passcode?.trim() ? (
                      <span className="text-white/45">
                        &middot; Passcode:{" "}
                        <span className="font-semibold text-white/75">{contact.passcode}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-amber-300">
                        &middot; Passcode needed
                        <input
                          aria-label={`Passcode for ${contact.label}`}
                          placeholder="Add passcode"
                          maxLength={LANVAC_PASSCODE_MAX}
                          value={contact.passcode ?? ""}
                          onChange={(e) => setPasscode(contact.id, e.target.value)}
                          className={`${inputClass} !py-1 w-36`}
                        />
                      </span>
                    )}
                  </p>
                </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={applyEdit}
                      className="min-h-11 cursor-pointer rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-default disabled:opacity-50"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={cancelEdit}
                      className="min-h-11 cursor-pointer rounded-lg border border-white/20 px-3 text-xs font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pending || editingId != null}
                      onClick={() => startEdit(contact)}
                      className="min-h-11 cursor-pointer rounded-lg border border-white/20 px-3 text-xs font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending || editingId != null}
                      onClick={() => removeContact(contact.id)}
                      className="min-h-11 cursor-pointer rounded-lg border border-red-500/30 px-3 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
            );
          })}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Name / relation
            <input
              placeholder="e.g. Sarah (daughter)"
              maxLength={LANVAC_CONTACT_NAME_MAX}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Phone number
            <input
              type="tel"
              placeholder="(705) 555-0123"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Passcode
            <input
              placeholder="Their verification word"
              maxLength={LANVAC_PASSCODE_MAX}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={addContact}
            className="cursor-pointer rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          The passcode is the word this person gives the monitoring station to
          prove who they are when the alarm goes off. Use Edit on an existing
          person to change their name, number, or passcode, then Save List.
        </p>
      </div>

      {variant === "admin" && dirty && (
        <div className="grid gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            How did the client authorize this change? *
            <select
              value={authorizedVia}
              onChange={(e) => setAuthorizedVia(e.target.value)}
              className={`${inputClass} select-chevron cursor-pointer`}
            >
              <option value="">Choose...</option>
              {AUTHORIZATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Reason / request reference *
            <textarea
              rows={2}
              placeholder={'e.g. "Client emailed 2026-07-05 asking to remove former employee"'}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className={inputClass}
            />
          </label>
          <p className="text-xs leading-relaxed text-amber-200/80 sm:col-span-2">
            This change is recorded in the permanent history and the client is
            emailed the exact changes with this reason. Email requests are the
            preferred evidence; verbal changes are allowed but flagged.
          </p>
        </div>
      )}

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm leading-relaxed ${
            notice.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : notice.kind === "wait"
                ? "border-sky-400/30 bg-sky-500/10 text-sky-100"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/40">
          {variant === "client"
            ? "Saving emails McKee Security so they can update the monitoring station. Please wait a couple of minutes between saves."
            : "Both McKee and the client are emailed the exact changes on save."}
        </p>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          aria-busy={pending}
          className="relative w-full cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-60 sm:w-auto"
        >
          <span className={pending ? "invisible" : undefined}>Save List</span>
          {pending && (
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
