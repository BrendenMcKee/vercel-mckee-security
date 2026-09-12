"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { setAccountAutoOnboardAction } from "@/lib/portal/actions/clients";
import { accountDisplayName, accountSitesThisFirst } from "@/lib/portal/account-list";
import { PortalHelpSection, PortalHelpTip } from "@/components/portal/portal-help-tip";

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
  const sites = accountSitesThisFirst(account.sites, currentProfileId);

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
          ? "Automatic onboarding is on. New sites on this account can get invitation mail."
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

      <ul className="mt-4 space-y-2">
        {sites.map((site) => {
          const current = site.id === currentProfileId;
          const label = `${site.first_name} ${site.last_name}`.trim();
          return (
            <li
              key={site.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${
                current
                  ? "border-sky-400/70 bg-sky-500/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="min-w-0">
                {current ? (
                  <p className="truncate text-sm font-bold text-sky-200">{label}</p>
                ) : (
                  <Link
                    href={`/admin-dashboard/clients/${site.id}`}
                    className="block truncate text-sm font-bold text-white/75 hover:text-white"
                  >
                    {label}
                  </Link>
                )}
                <p className={`mt-0.5 text-xs ${current ? "text-sky-200/80" : "text-white/50"}`}>
                  {site.lanvac_account_code ?? "No CODE"}
                  {current ? " · this site" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
        <div className="min-w-0 max-w-xl">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">Automatic onboarding</p>
            <PortalHelpTip label="More info about automatic onboarding" title="Automatic onboarding">
              <PortalHelpSection title="Why this switch exists">
                <p>
                  When you add a new customer, the portal can email them a "set up your login"
                  link. A township with many buildings should not get one of those emails for
                  every building. This switch is the brake for this account only.
                </p>
              </PortalHelpSection>
              <PortalHelpSection title="What On means">
                <p>
                  The portal may email the join-the-portal letter for this account (the invite
                  to set a password and open the dashboard).
                </p>
              </PortalHelpSection>
              <PortalHelpSection title="What Off means">
                <p>
                  The portal will not send that letter by itself. You can still copy the link
                  and text it, email it, or read it over the phone.
                </p>
              </PortalHelpSection>
              <PortalHelpSection title="What this switch does not do">
                <p>
                  It does not stop bills, receipts, alarm-list emails, or battery notices.
                  Those are a different kind of email.
                </p>
              </PortalHelpSection>
              <PortalHelpSection title="When a second site is added">
                <p>
                  The switch turns Off so we do not treat every building like a brand-new
                  customer. Appoint account admin is a separate staff step that invites one
                  person for the whole account. That still works while this is Off. It is not
                  on this card yet.
                </p>
              </PortalHelpSection>
            </PortalHelpTip>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            This is only the join-the-portal email. Bills and alarm emails are separate.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wide ${
              autoOnboard ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {pending ? "Saving..." : autoOnboard ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoOnboard}
            aria-label="Automatic onboarding"
            disabled={pending}
            onClick={toggleAutoOnboard}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-out disabled:cursor-default disabled:opacity-50 ${
              autoOnboard ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
                autoOnboard ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
