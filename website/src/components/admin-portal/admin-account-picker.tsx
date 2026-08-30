"use client";

import { useMemo, useState } from "react";
import { adminInputClass } from "@/components/admin-portal/ui";
import {
  accountMatchesQuery,
  type AccountListOption,
} from "@/lib/portal/account-list";

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
  const matches = useMemo(() => {
    const filtered = accounts.filter((account) => accountMatchesQuery(account, query));
    const list =
      selected && !filtered.some((account) => account.id === selected.id)
        ? [selected, ...filtered]
        : filtered;
    return list.slice(0, 12);
  }, [accounts, query, selected]);

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1.5 text-sm text-white/80">
        Search accounts
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Account name, email, or CODE"
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

      {matches.length === 0 ? (
        <p className="text-sm text-white/50">No accounts match that search.</p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {matches.map((account) => {
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
                  <span className="text-xs text-white/50">
                    {account.siteCount === 1 ? "1 site" : `${account.siteCount} sites`}
                    {account.codes.length > 0 ? ` · ${account.codes.slice(0, 3).join(", ")}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
