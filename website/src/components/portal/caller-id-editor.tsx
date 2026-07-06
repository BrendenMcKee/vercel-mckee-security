"use client";

import { useMemo, useState, useTransition } from "react";
import { formatPhone, normalizePhone } from "@/lib/portal/phone";
import {
  saveMyCallerIdList,
  saveClientCallerIdList,
  type SaveCallerIdResult,
} from "@/lib/portal/actions/caller-id";

export type CallerIdContact = { phone: string; label: string; passcode: string | null };

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

/**
 * Shared caller ID list editor (R23): the client dashboard and the admin
 * client-detail page render the same list UI and run the same save pipeline.
 * Every contact carries the passcode the monitoring station uses to verify
 * them. The admin variant additionally requires an authorization method +
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
  const [contacts, setContacts] = useState<CallerIdContact[]>(initialContacts);
  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [authorizedVia, setAuthorizedVia] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (contacts.length !== initialContacts.length) return true;
    const initial = new Set(initialContacts.map(contactKey));
    return contacts.some((c) => !initial.has(contactKey(c)));
  }, [contacts, initialContacts]);

  // Existing contacts saved before passcodes existed need one before the
  // next save goes through.
  const missingPasscodes = contacts.filter((c) => !c.passcode?.trim());

  function addContact() {
    setNotice(null);
    const label = newLabel.trim();
    if (!label) {
      setNotice({ kind: "error", text: "Add the person's name first." });
      return;
    }
    const phone = normalizePhone(newPhone);
    if (!phone) {
      setNotice({ kind: "error", text: `"${newPhone}" is not a valid North American phone number.` });
      return;
    }
    const passcode = newPasscode.trim();
    if (!passcode) {
      setNotice({
        kind: "error",
        text: "Add this person's passcode. It's the word they give the monitoring station to confirm who they are.",
      });
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
    setContacts((list) => [...list, { phone, label, passcode }]);
    setNewLabel("");
    setNewPhone("");
    setNewPasscode("");
  }

  function removeContact(phone: string) {
    setNotice(null);
    setContacts((list) => list.filter((c) => c.phone !== phone));
  }

  function setPasscode(phone: string, passcode: string) {
    setNotice(null);
    setContacts((list) => list.map((c) => (c.phone === phone ? { ...c, passcode } : c)));
  }

  function describeDiff(): string {
    const initial = new Set(initialContacts.map(contactKey));
    const next = new Set(contacts.map(contactKey));
    const added = contacts.filter((c) => !initial.has(contactKey(c)));
    const removed = initialContacts.filter((c) => !next.has(contactKey(c)));
    const line = (c: CallerIdContact) =>
      `${c.label}, ${formatPhone(c.phone)}${c.passcode ? `, passcode: ${c.passcode}` : ""}`;
    return [
      ...added.map((c) => `+ ${line(c)}`),
      ...removed.map((c) => `- ${line(c)}`),
    ].join("\n");
  }

  function save() {
    setNotice(null);

    if (missingPasscodes.length > 0) {
      setNotice({
        kind: "error",
        text: `Every contact needs a passcode before saving. Missing: ${missingPasscodes.map((c) => c.label).join(", ")}.`,
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
        `Save these contact list changes on the client's behalf?\n\n${describeDiff()}\n\nThe client will be emailed these exact changes and the reason you recorded.`,
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const payload = contacts.map((c) => ({ phone: c.phone, label: c.label, passcode: c.passcode ?? "" }));
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
            ? "The client was emailed the changes and reason."
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
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                  {index + 1}
                </span>
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
                          maxLength={40}
                          value={contact.passcode ?? ""}
                          onChange={(e) => setPasscode(contact.phone, e.target.value)}
                          className={`${inputClass} !py-1 w-36`}
                        />
                      </span>
                    )}
                  </p>
                </div>
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
          Name / relation
          <input
            placeholder="e.g. Sarah (daughter)"
            maxLength={80}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className={inputClass}
          />
        </label>
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
          Passcode
          <input
            placeholder="Their verification word"
            maxLength={40}
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
        <p className="w-full text-xs text-white/40">
          The passcode is the word this person gives the monitoring station to
          prove who they are when the alarm goes off.
        </p>
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
            This change is recorded in the permanent history and the client is
            emailed the exact changes with this reason. Email requests are the
            preferred evidence; verbal changes are allowed but flagged.
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
            : "Both McKee and the client are emailed the exact changes on save."}
        </p>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          aria-busy={pending}
          className="relative cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-60"
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
