"use client";

import { useState, useTransition } from "react";
import { setClientMailEnabledAction } from "@/lib/portal/actions/settings";
import { CLIENT_MAIL_GO_LIVE_PHRASE } from "@/lib/portal/client-mail-phrase";

const GO_LIVE_PROMPT = `Turn on client email?

This emails real customers: invitations, payment reminders, payment receipts, caller-ID changes, and device-replacement notices.

Only do this after:
1. Multi-site accounts have shipped and the CUA portal test is clean
2. The client import is complete and spot-checked
3. Organization grouping is signed off
4. The portal is working the way you expect
5. The QuickBooks bridge is on the live company file (McKee Security Live.QBW), not PORTAL-TEST
6. You are ready for customers to hear from the portal

To confirm, type: ${CLIENT_MAIL_GO_LIVE_PHRASE}`;

/**
 * Billing-tab go-live control. Default is off; enabling is a typed confirm
 * so import cannot start customer mail by accident.
 */
export function ClientMailGate({
  enabled,
  enabledAt,
}: {
  enabled: boolean;
  enabledAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function turnOn() {
    const typed = window.prompt(GO_LIVE_PROMPT);
    if (typed === null) return;
    setError(null);
    startTransition(async () => {
      const result = await setClientMailEnabledAction({
        enabled: true,
        confirmPhrase: typed,
      });
      if (!result.ok) setError(result.error);
    });
  }

  function pause() {
    const ok = window.confirm(
      "Pause client email? Customers will stop receiving invitations, reminders, and notices. Staff emails keep going.",
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await setClientMailEnabledAction({ enabled: false });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 ${
        enabled
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <p
        className={`text-sm font-bold uppercase tracking-widest ${
          enabled ? "text-emerald-300" : "text-amber-300"
        }`}
      >
        {enabled ? "Client email is live" : "Client email is paused"}
      </p>
      <h2 className="mt-2 text-lg font-bold text-white">Go-live: customer mail</h2>
      <p className={`mt-2 text-sm leading-relaxed ${enabled ? "text-emerald-100/90" : "text-amber-100/90"}`}>
        {enabled
          ? "Invitations, payment reminders, payment receipts, caller-ID notices, and device-replacement mail are sending to customers."
          : "Import and testing stay silent to customers. Staff still get collections digests, card-failed alerts, and device-expiry alerts. Do not flip before multi-site, the CUA test, the real import, and grouping sign-off."}
      </p>
      {!enabled && (
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-amber-50/90">
          <li>Multi-site accounts have shipped and the CUA portal test is clean.</li>
          <li>Client import is complete and a sample of accounts is spot-checked.</li>
          <li>Organization grouping is signed off on the grouping board.</li>
          <li>The portal is working the way you expect (billing, contacts, devices).</li>
          <li>The QuickBooks bridge is on the live company file, not PORTAL-TEST.</li>
          <li>You are ready for customers to receive portal email.</li>
        </ol>
      )}
      {enabled && enabledAt && (
        <p className="mt-3 text-xs text-emerald-200/70">
          Turned on {new Date(enabledAt).toLocaleString("en-CA")}.
        </p>
      )}
      <div className="mt-4">
        {enabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={pause}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Saving..." : "Pause client email"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={turnOn}
            className="cursor-pointer rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Saving..." : "Turn on client email"}
          </button>
        )}
      </div>
      {error && (
        <p role="status" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
