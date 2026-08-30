"use client";

import { useMemo, useState } from "react";
import { adminInputClass } from "@/components/admin-portal/ui";
import {
  accountMatchesQuery,
  accountPickerDetail,
  type AccountListOption,
} from "@/lib/portal/account-list";

const PICKER_LIMIT = 12;

export function AdminAccountPicker({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: AccountListOption[];
  selectedId: string;
  onSelect: (accountId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = accounts.find((account) => account.id === selectedId) ?? null;
  const { shown, matchCount } = useMemo(() => {
    const filtered = accounts.filter((account) => accountMatchesQuery(account, query));
    const list =
      selected && !filtered.some((account) => account.id === selected.id)
        ? [selected, ...filtered]
        : filtered;
    return { shown: list.slice(0, PICKER_LIMIT), matchCount: filtered.length };
  }, [accounts, query, selected]);

  const narrowed = Boolean(query.trim());
  const hiddenCount = Math.max(0, matchCount - shown.length);

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm text-white/80">
        Search accounts
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Account name, site, email, or CODE"
          className={`${adminInputClass} w-full sm:max-w-md`}
        />
      </label>

      {selected && (
        <p className="text-sm text-white/70">
          Adding a site to{" "}
          <span className="font-bold text-white">{selected.name}</span>
          {selected.siteCount > 1 ? ` · ${selected.siteCount} sites` : ""}.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-white/50">No accounts match that search.</p>
      ) : (
        <>
          {(accounts.length > PICKER_LIMIT || hiddenCount > 0) && (
            <p className="text-xs text-white/40">
              {narrowed
                ? hiddenCount > 0
                  ? `Showing ${shown.length} of ${matchCount}. Type more to narrow.`
                  : `${matchCount} match${matchCount === 1 ? "" : "es"}.`
                : `Showing ${shown.length} of ${accounts.length}. Type to narrow.`}
            </p>
          )}
          <ul className="max-h-72 divide-y divide-white/10 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10">
            {shown.map((account) => {
              const active = account.id === selectedId;
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className={`flex w-full cursor-pointer flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
                      active ? "bg-amber-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">{account.name}</span>
                    <span className="text-xs text-white/50">{accountPickerDetail(account)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
