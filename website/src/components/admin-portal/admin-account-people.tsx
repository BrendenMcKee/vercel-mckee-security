"use client";

import { useMemo, useState, useTransition } from "react";
import {
  clientRoleLabel,
  LAST_OWNER_REVOKE_MESSAGE,
} from "@/lib/portal/account-roles";
import { revokeAccountMemberAction } from "@/lib/portal/actions/members";

export type AdminAccountMember = {
  id: string;
  email: string;
  role: string;
  user_id: string | null;
};

type Notice = { kind: "ok" | "error"; text: string } | null;

export function AdminAccountPeople({ members }: { members: AdminAccountMember[] }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.email.localeCompare(b.email);
    });
  }, [members]);
  const ownerCount = ordered.filter((row) => row.role === "owner").length;

  function revoke(member: AdminAccountMember) {
    const label = clientRoleLabel(member.role);
    const confirmed = window.confirm(
      `Revoke ${member.email} (${label})?\n\nThey will lose access to every site on this account. The sites stay. If they still belong to another account, that login stays.`,
    );
    if (!confirmed) return;
    setNotice(null);
    setPendingId(member.id);
    startTransition(async () => {
      const result = await revokeAccountMemberAction({ memberId: member.id });
      setPendingId(null);
      setNotice(
        result.ok
          ? { kind: "ok", text: `${member.email} no longer has access to this account.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">People with access</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        Who can open every site on this account. Revoke drops the login from
        this account only. The last Account admin cannot be revoked.
      </p>

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

      <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
        {ordered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-white/50">No people on this account yet.</li>
        ) : (
          ordered.map((member) => {
            const lastOwner = member.role === "owner" && ownerCount <= 1;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{member.email}</p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {clientRoleLabel(member.role)}
                    {member.user_id ? " · signed in" : " · invite not used"}
                  </p>
                </div>
                {lastOwner ? (
                  <p className="max-w-xs text-right text-[11px] leading-relaxed text-white/40">
                    {LAST_OWNER_REVOKE_MESSAGE}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => revoke(member)}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                  >
                    {pending && pendingId === member.id ? "Revoking..." : "Revoke"}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
