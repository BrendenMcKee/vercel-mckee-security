"use client";

import { useState, useTransition, type FormEvent } from "react";
import { formatPhone } from "@/lib/portal/phone";
import {
  updateMyAccountAction,
  updateMyPasswordAction,
} from "@/lib/portal/actions/account";
import { PortalCard } from "@/components/portal/portal-card";

const fieldClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";
const lockedClass =
  "cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/45";

export function ClientSettingsForm({
  email,
  phone,
  address,
}: {
  email: string | null;
  phone: string | null;
  address: string | null;
}) {
  const [account, setAccount] = useState({
    phone: phone ? formatPhone(phone) : "",
    address: address ?? "",
  });
  const [passwords, setPasswords] = useState({ password: "", confirmPassword: "" });
  const [accountNotice, setAccountNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [accountPending, startAccount] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountNotice(null);
    startAccount(async () => {
      const result = await updateMyAccountAction(account);
      if (!result.ok) {
        setAccountNotice({ kind: "error", text: result.error });
        return;
      }
      setAccountNotice({ kind: "ok", text: "Account details saved. McKee Security has been notified." });
    });
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);
    startPassword(async () => {
      const result = await updateMyPasswordAction(passwords);
      if (!result.ok) {
        setPasswordNotice({ kind: "error", text: result.error });
        return;
      }
      setPasswords({ password: "", confirmPassword: "" });
      setPasswordNotice({ kind: "ok", text: "Password updated." });
    });
  }

  return (
    <div className="space-y-6">
      <PortalCard
        icon="settings"
        tone="billing"
        title="Account details"
        description="Phone and service address on this account. Your sign-in email cannot be changed here."
      >
        <form onSubmit={saveAccount} className="space-y-4 border-t border-white/10 pt-5">
          {accountNotice && (
            <p
              role="status"
              className={`rounded-xl border p-3 text-sm ${
                accountNotice.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {accountNotice.text}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Email
            <input type="email" value={email ?? ""} disabled readOnly className={lockedClass} />
            <span className="text-xs text-white/40">
              This is the address you use to sign in. Call McKee Security if it needs to change.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Phone number
            <input
              type="tel"
              value={account.phone}
              onChange={(event) => setAccount((current) => ({ ...current, phone: event.target.value }))}
              placeholder="(705) 555-0123"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Service address
            <input
              value={account.address}
              onChange={(event) => setAccount((current) => ({ ...current, address: event.target.value }))}
              placeholder="Street, city, postal code"
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={accountPending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover) disabled:cursor-default disabled:opacity-50"
          >
            {accountPending ? "Saving..." : "Save account details"}
          </button>
        </form>
      </PortalCard>

      <PortalCard
        icon="settings"
        tone="billing"
        title="Password"
        description="Change the password you use with email sign-in. You are already signed in, so the current password is not required."
      >
        <form onSubmit={savePassword} className="space-y-4 border-t border-white/10 pt-5">
          {passwordNotice && (
            <p
              role="status"
              className={`rounded-xl border p-3 text-sm ${
                passwordNotice.kind === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {passwordNotice.text}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={passwords.password}
              onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={passwords.confirmPassword}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={passwordPending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-(--primary-hover) disabled:cursor-default disabled:opacity-50"
          >
            {passwordPending ? "Updating..." : "Update password"}
          </button>
        </form>
      </PortalCard>
    </div>
  );
}
