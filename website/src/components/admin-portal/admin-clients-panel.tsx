"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tables } from "@/lib/portal/database.types";
import {
  createClientAction,
  deleteClientAction,
  resendInviteAction,
  type CreateClientInput,
} from "@/lib/portal/actions/clients";

type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "target_email" | "expires_at" | "used_at" | "created_at"
>;

export type AdminClientRow = Tables<"profiles"> & {
  services: Tables<"services">[];
  invitations: InvitationSummary[];
};

const MONITORING_TIERS = ["basic", "standard", "pro"] as const;
const CLOUD_TIERS = ["7day", "30day", "90day"] as const;

const EMPTY_FORM: CreateClientInput = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  monitoringTier: "",
  cloudTier: "",
};

const inputClass =
  "rounded-xl border border-white/15 bg-background px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary";

function StatusBadge({ status }: { status: Tables<"profiles">["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    disabled: "bg-white/10 text-white/50 border-white/15",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

function inviteState(client: AdminClientRow): {
  label: string;
  tone: "ok" | "warn" | "muted";
  canResend: boolean;
} {
  if (client.status !== "pending") {
    return { label: "—", tone: "muted", canResend: false };
  }
  const open = client.invitations.find((inv) => !inv.used_at);
  if (!open) return { label: "No invite", tone: "warn", canResend: true };
  const msLeft = new Date(open.expires_at).getTime() - Date.now();
  if (msLeft <= 0) return { label: "Invite expired", tone: "warn", canResend: true };
  const days = Math.ceil(msLeft / 86400_000);
  return {
    label: `Invited · ${days}d left`,
    tone: "ok",
    canResend: true,
  };
}

function serviceChips(services: Tables<"services">[]): string[] {
  return services.map((s) =>
    s.service_type === "monitoring" ? `Monitoring · ${s.tier}` : `Cloud · ${s.tier}`,
  );
}

export function AdminClientsPanel({ clients }: { clients: AdminClientRow[] }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClientInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  function set<K extends keyof CreateClientInput>(key: K, value: CreateClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await createClientAction(form);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      if (!result.emailAttempted) {
        setNotice({
          kind: "ok",
          text: "Client created. No email on file — copy the activation link and deliver it yourself:",
          link: result.activateUrl,
        });
      } else if (!result.emailSent) {
        setNotice({
          kind: "error",
          text: "Client created, but the invitation email failed to send. Copy the link and deliver it yourself:",
          link: result.activateUrl,
        });
      } else {
        setNotice({ kind: "ok", text: "Client created and invitation email sent." });
      }
    });
  }

  function remove(client: AdminClientRow) {
    const name = `${client.first_name} ${client.last_name}`;
    // Explicit confirm for destructive admin actions (handover 14.2).
    const confirmed = window.confirm(
      `Permanently delete ${name}?\n\nThis removes their sign-in, profile, services, and invitations everywhere. This cannot be undone.`,
    );
    if (!confirmed) return;
    setNotice(null);
    setDeletingId(client.id);
    startTransition(async () => {
      const result = await deleteClientAction(client.id);
      setDeletingId(null);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setNotice({ kind: "ok", text: `${name} and all their data were deleted.` });
    });
  }

  function resend(profileId: string) {
    setNotice(null);
    setResendingId(profileId);
    startTransition(async () => {
      const result = await resendInviteAction(profileId);
      setResendingId(null);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (!result.emailAttempted) {
        setNotice({
          kind: "ok",
          text: "New invitation created. No email on file — copy the activation link:",
          link: result.activateUrl,
        });
      } else if (!result.emailSent) {
        setNotice({
          kind: "error",
          text: "Invitation refreshed, but the email failed to send. Copy the link:",
          link: result.activateUrl,
        });
      } else {
        setNotice({ kind: "ok", text: "Invitation refreshed and email re-sent." });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Clients</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} min-w-[14rem]`}
          />
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setNotice(null);
            }}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)]"
          >
            {showForm ? "Close" : "New Client"}
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            notice.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <p>{notice.text}</p>
          {notice.link && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-black/30 px-2 py-1 text-xs text-white/80">
                {notice.link}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(notice.link!)}
                className="cursor-pointer rounded-lg border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitCreate}
          className="grid gap-4 rounded-2xl border border-white/10 bg-surface p-6 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            First name *
            <input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Last name *
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-white/40">
              Invitation is emailed when set; otherwise you get a link to deliver.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Address
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Security monitoring
            <select
              value={form.monitoringTier}
              onChange={(e) => set("monitoringTier", e.target.value as CreateClientInput["monitoringTier"])}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">None</option>
              {MONITORING_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Cloud backup
            <select
              value={form.cloudTier}
              onChange={(e) => set("cloudTier", e.target.value as CreateClientInput["cloudTier"])}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">None</option>
              {CLOUD_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create Client & Send Invite"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Services</th>
              <th className="px-4 py-3 font-bold">Invitation</th>
              <th className="px-4 py-3 text-right font-bold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                  {clients.length === 0
                    ? "No clients yet. Create the first one with New Client."
                    : "No clients match your search."}
                </td>
              </tr>
            )}
            {filtered.map((client) => {
              const invite = inviteState(client);
              return (
                <tr key={client.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-bold text-white">
                    {client.first_name} {client.last_name}
                  </td>
                  <td className="px-4 py-3 text-white/70">{client.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {client.services.length === 0 ? (
                      <span className="text-white/30">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {serviceChips(client.services).map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/70"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          invite.tone === "ok"
                            ? "text-emerald-300"
                            : invite.tone === "warn"
                              ? "text-amber-300"
                              : "text-white/30"
                        }
                      >
                        {invite.label}
                      </span>
                      {invite.canResend && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resend(client.id)}
                          className="cursor-pointer rounded-lg border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                        >
                          {resendingId === client.id ? "Sending..." : "Resend"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(client)}
                      className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                    >
                      {deletingId === client.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
