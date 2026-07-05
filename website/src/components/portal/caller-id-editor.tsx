"use client";

import { useMemo, useState, useTransition } from "react";
import { formatPhone, normalizePhone } from "@/lib/portal/phone";
import {
  saveMyCallerIdList,
  saveClientCallerIdList,
  type SaveCallerIdResult,
} from "@/lib/portal/actions/caller-id";

export type CallerIdContact = { phone: string; label: string };

const AUTHORIZATION_OPTIONS = [
  { value: "client_email", label: "Client emailed the request (preferred)" },
  { value: "client_verbal", label: "Client requested verbally (phone/site visit)" },
  { value: "client_in_person", label: "Client requested in person" },
  { value: "mckee_initiated", label: "McKee-initiated correction" },
] as const;

const inputClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";

/**
 * Shared caller ID list editor (R23): the client dashboard and the admin
 * client-detail page render the same list UI and run the same save pipeline.
 * The admin variant additionally requires an authorization method + reason
 * note (R24) and shows the exact diff in the confirm dialog before saving.
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
  const [contacts, setContacts] = useState<CallerIdContact[]>(initialContacts);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [authorizedVia, setAuthorizedVia] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (contacts.length !== initialContacts.length) return true;
    const key = (c: CallerIdContact) => `${c.phone}|${c.label}`;
    const initial = new Set(initialContacts.map(key));
    return contacts.some((c) => !initial.has(key(c)));
  }, [contacts, initialContacts]);

  function addContact() {
    setNotice(null);
    const phone = normalizePhone(newPhone);
    if (!phone) {
      setNotice({ kind: "error", text: `"${newPhone}" is not a valid North American phone number.` });
      return;
    }
    const label = newLabel.trim();
    if (!label) {
      setNotice({ kind: "error", text: "Add a name for this contact." });
      return;
    }
    if (contacts.some((c) => c.phone === phone)) {
      setNotice({ kind: "error", text: `${formatPhone(phone)} is already on the list.` });
      return;
    }
    if (contacts.length >= 15) {
      setNotice({ kind: "error", text: "The list is capped at 15 contacts." });
      return;
    }
    setContacts((list) => [...list, { phone, label }]);
    setNewPhone("");
    setNewLabel("");
  }

  function removeContact(phone: string) {
    setNotice(null);
    setContacts((list) => list.filter((c) => c.phone !== phone));
  }

  function describeDiff(): string {
    const key = (c: CallerIdContact) => `${c.phone}|${c.label}`;
    const initial = new Map(initialContacts.map((c) => [key(c), c]));
    const next = new Map(contacts.map((c) => [key(c), c]));
    const added = contacts.filter((c) => !initial.has(key(c)));
    const removed = initialContacts.filter((c) => !next.has(key(c)));
    return [
      ...added.map((c) => `+ ${formatPhone(c.phone)} (${c.label})`),
      ...removed.map((c) => `- ${formatPhone(c.phone)} (${c.label})`),
    ].join("\n");
  }

  function save() {
    setNotice(null);

    if (variant === "admin") {
      if (!authorizedVia) {
        setNotice({ kind: "error", text: "Select how the client authorized this change before saving (R24)." });
        return;
      }
      if (changeReason.trim().length < 10) {
        setNotice({ kind: "error", text: "Describe the client's request (at least 10 characters) so the change can be reconciled later." });
        return;
      }
      // R24: the exact diff is confirmed before an admin save commits.
      const confirmed = window.confirm(
        `Save these caller ID changes on the client's behalf?\n\n${describeDiff()}\n\nThe client will be emailed this exact diff and the reason you recorded.`,
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      let result: SaveCallerIdResult;
      if (variant === "admin") {
        result = await saveClientCallerIdList({
          profileId: profileId!,
          contacts,
          authorizedVia,
          changeReason: changeReason.trim(),
        });
      } else {
        result = await saveMyCallerIdList({ contacts });
      }

      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (result.noChange) {
        setNotice({ kind: "ok", text: "No changes to save." });
        return;
      }
      const parts = [
        `List saved (${result.added.length} added, ${result.removed.length} removed).`,
        result.adminEmailSent
          ? "McKee has been notified and will update the monitoring station."
          : "Heads up: the notification email to McKee failed; please call to confirm the change was received.",
      ];
      if (variant === "admin") {
        parts.push(
          result.clientEmailSent
            ? "The client was emailed the diff and reason."
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
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No contacts on the list. The monitoring station needs at least one
          person to call when the alarm goes off.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact, index) => (
            <li
              key={contact.phone}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-background px-4 py-3"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold text-white/30">{index + 1}.</span>
                <span className="font-bold text-white">{formatPhone(contact.phone)}</span>
                <span className="text-sm text-white/60">{contact.label}</span>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => removeContact(contact.phone)}
                className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-white/15 p-4">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm text-white/80">
          Phone number
          <input
            type="tel"
            placeholder="(705) 555-0123"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm text-white/80">
          Name / relation
          <input
            placeholder="e.g. Sarah (daughter)"
            maxLength={80}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
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

      {variant === "admin" && dirty && (
        <div className="grid gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            How did the client authorize this change? *
            <select
              value={authorizedVia}
              onChange={(e) => setAuthorizedVia(e.target.value)}
              className={`${inputClass} cursor-pointer`}
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
            This change is recorded in the permanent audit history and the
            client is emailed the exact diff with this reason. Email requests
            are the preferred evidence; verbal changes are allowed but flagged.
          </p>
        </div>
      )}

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm ${
            notice.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/40">
          {variant === "client"
            ? "Saving notifies McKee Security, who update the monitoring station."
            : "Both McKee and the client are emailed the exact diff on save."}
        </p>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save List"}
        </button>
      </div>
    </div>
  );
}
