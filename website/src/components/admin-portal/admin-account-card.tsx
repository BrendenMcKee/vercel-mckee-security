"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { setAccountAutoOnboardAction } from "@/lib/portal/actions/clients";
import { accountDisplayName } from "@/lib/portal/account-list";

export type AdminAccountSiteLink = {
  id: string;
  first_name: string;
  last_name: string;
  lanvac_account_code: string | null;
};

export type AdminAccountCardAccount = {
  id: string;
  name: string;
  autoOnboard: boolean;
  sites: AdminAccountSiteLink[];
};

export function AdminAccountCard({
  account,
  currentProfileId,
}: {
  account: AdminAccountCardAccount;
  currentProfileId: string;
}) {
  const [autoOnboard, setAutoOnboard] = useState(account.autoOnboard);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAutoOnboard(account.autoOnboard);
  }, [account.autoOnboard]);
  const name = accountDisplayName(account.name);
  const siteCount = account.sites.length;

  function toggleAutoOnboard() {
    const next = !autoOnboard;
    setNotice(null);
    startTransition(async () => {
      const result = await setAccountAutoOnboardAction({
        accountId: account.id,
        autoOnboard: next,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setAutoOnboard(next);
      setNotice({
        kind: "ok",
        text: next
          ? "Automatic onboarding is on. Invite mail still waits for go-live on the Billing tab."
          : "Automatic onboarding is off. Staff can still copy an invitation link.",
      });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">Account</h2>
          <p className="mt-1 text-sm text-white/70">
            <span className="font-bold text-white">{name}</span>
            {" · "}
            {siteCount === 1 ? "1 site" : `${siteCount} sites`}
          </p>
        </div>
        <Link
          href={`/admin-dashboard?tab=clients&addTo=${account.id}`}
          className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10"
        >
          Add site to this account
        </Link>
      </div>

      {notice && (
        <p
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm ${
            notice.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {notice.text}
        </p>
      )}

      <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {account.sites.map((site) => {
          const current = site.id === currentProfileId;
          const label = `${site.first_name} ${site.last_name}`.trim();
          return (
            <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                {current ? (
                  <p className="truncate text-sm font-bold text-white">{label}</p>
                ) : (
                  <Link
                    href={`/admin-dashboard/clients/${site.id}`}
                    className="block truncate text-sm font-bold text-amber-200 hover:text-white"
                  >
                    {label}
                  </Link>
                )}
                <p className="mt-0.5 text-xs text-white/50">
                  {site.lanvac_account_code ?? "No CODE"}
                  {current ? " · this site" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
        <div className="min-w-0 max-w-xl">
          <p className="text-sm font-bold text-white">Automatic onboarding</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            When off, the portal does not automatically send onboarding mail for
            this account. Staff can still copy a link. A second site turns this
            off. It does not mute payment, caller-ID, or device mail.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={toggleAutoOnboard}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-default disabled:opacity-50 ${
            autoOnboard
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              : "border-white/20 text-white/70 hover:bg-white/10"
          }`}
        >
          {pending ? "Saving..." : autoOnboard ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
