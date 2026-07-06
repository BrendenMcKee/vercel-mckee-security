"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/portal/database.types";
import {
  createClientAction,
  deleteClientAction,
  resendInviteAction,
  type CreateClientInput,
} from "@/lib/portal/actions/clients";
import {
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import { adminInputClass, adminSelectClass, ProfileStatusBadge } from "@/components/admin-portal/ui";

type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "target_email" | "expires_at" | "used_at" | "created_at"
>;

export type AdminClientRow = Tables<"profiles"> & {
  services: Tables<"services">[];
  invitations: InvitationSummary[];
};

const EMPTY_FORM: CreateClientInput = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  monitoringTier: "",
  cloudTier: "",
  billingMethod: "stripe",
};

const PAGE_SIZE = 25;

type SortKey = "name" | "email" | "status" | "created";
type SortDir = "asc" | "desc";

function inviteState(client: AdminClientRow): {
  label: string;
  tone: "ok" | "warn" | "muted";
  canResend: boolean;
} {
  if (client.status !== "pending") {
    return { label: "Activated", tone: "muted", canResend: false };
  }
  const open = client.invitations.find((inv) => !inv.used_at);
  if (!open) return { label: "No invite", tone: "warn", canResend: true };
  const msLeft = new Date(open.expires_at).getTime() - Date.now();
  if (msLeft <= 0) return { label: "Invite expired", tone: "warn", canResend: true };
  const days = Math.ceil(msLeft / 86400_000);
  return { label: `Invited · ${days}d left`, tone: "ok", canResend: true };
}

function serviceChips(services: Tables<"services">[]): string[] {
  return services.map(
    (s) =>
      `${s.service_type === "monitoring" ? "Monitoring" : "Cloud"} · ${tierLabel(s.tier)}${s.status !== "active" ? ` (${s.status})` : ""}`,
  );
}

function compare(a: AdminClientRow, b: AdminClientRow, key: SortKey): number {
  switch (key) {
    case "name":
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    case "email":
      return (a.email ?? "").localeCompare(b.email ?? "");
    case "status":
      return a.status.localeCompare(b.status);
    case "created":
      return a.created_at.localeCompare(b.created_at);
  }
}

export function AdminClientsPanel({ clients }: { clients: AdminClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Tables<"profiles">["status"]>("");
  const [serviceFilter, setServiceFilter] = useState<"" | ServiceType | "none">("");
  const [tierFilter, setTierFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClientInput>(EMPTY_FORM);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients;
    if (q) {
      rows = rows.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    if (serviceFilter === "none") {
      rows = rows.filter((c) => c.services.length === 0);
    } else if (serviceFilter) {
      rows = rows.filter((c) => c.services.some((s) => s.service_type === serviceFilter));
    }
    if (tierFilter) {
      rows = rows.filter((c) =>
        c.services.some(
          (s) => s.tier === tierFilter && (serviceFilter === "" || serviceFilter === "none" || s.service_type === serviceFilter),
        ),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const result = compare(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [clients, search, statusFilter, serviceFilter, tierFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const tierOptions =
    serviceFilter && serviceFilter !== "none"
      ? SERVICE_TIERS[serviceFilter]
      : [...SERVICE_TIERS.monitoring, ...SERVICE_TIERS.cloud_backup];

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
    setPage(0);
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span aria-hidden="true"> {sortDir === "asc" ? "▲" : "▼"}</span>;
  }

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
          text: "Client created. There is no email on file, so copy the activation link and deliver it yourself:",
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
    // Destructive admin action (handover 14.2): type-to-confirm, verified
    // again on the server. Deleting erases the client everywhere and stops
    // any automatic card payments in Stripe first.
    const typed = window.prompt(
      `Permanently delete ${name}?\n\nThis erases their sign-in, profile, services, contact list, devices, payment history, and invitations, and stops any automatic card payments. This cannot be undone.\n\nTo confirm, type the client's full name exactly:`,
    );
    if (typed === null) return;
    if (typed.trim().replace(/\s+/g, " ").toLowerCase() !== name.trim().replace(/\s+/g, " ").toLowerCase()) {
      setNotice({ kind: "error", text: `The name you typed does not match ${name}. Nothing was deleted.` });
      return;
    }
    setNotice(null);
    setDeletingId(client.id);
    startTransition(async () => {
      const result = await deleteClientAction({ profileId: client.id, confirmName: typed });
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
          text: "New invitation created. There is no email on file, so copy the activation link:",
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

  const selectClass = adminSelectClass;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Clients</h2>
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

      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className={`${adminInputClass} w-full sm:max-w-sm`}
        />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(0);
            }}
            className={`${selectClass} max-w-full`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value as typeof serviceFilter);
              setTierFilter("");
              setPage(0);
            }}
            className={`${selectClass} max-w-full`}
            aria-label="Filter by service"
          >
            <option value="">All services</option>
            <option value="monitoring">{SERVICE_TYPE_LABELS.monitoring}</option>
            <option value="cloud_backup">{SERVICE_TYPE_LABELS.cloud_backup}</option>
            <option value="none">No services</option>
          </select>
          {serviceFilter !== "none" && (
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              className={`${selectClass} max-w-full`}
              aria-label="Filter by tier"
            >
              <option value="">All tiers</option>
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tierLabel(tier)}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-white/40">
            {filtered.length} of {clients.length}
          </span>
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
              className={adminInputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Last name *
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={adminInputClass}
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
              className={adminInputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Security monitoring
            <select
              value={form.monitoringTier}
              onChange={(e) => set("monitoringTier", e.target.value as CreateClientInput["monitoringTier"])}
              className={selectClass}
            >
              <option value="">None</option>
              {SERVICE_TIERS.monitoring.map((tier) => (
                <option key={tier} value={tier}>
                  {tierLabel(tier)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Cloud backup
            <select
              value={form.cloudTier}
              onChange={(e) => set("cloudTier", e.target.value as CreateClientInput["cloudTier"])}
              className={selectClass}
            >
              <option value="">None</option>
              {SERVICE_TIERS.cloud_backup.map((tier) => (
                <option key={tier} value={tier}>
                  {tierLabel(tier)}
                </option>
              ))}
            </select>
          </label>
          {(form.monitoringTier || form.cloudTier) && (
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              How will they pay?
              <select
                value={form.billingMethod}
                onChange={(e) => set("billingMethod", e.target.value as CreateClientInput["billingMethod"])}
                className={selectClass}
              >
                <option value="stripe">Automatic card payments (recommended)</option>
                <option value="manual">e-Transfer / cheque / cash</option>
              </select>
              <span className="text-xs text-white/40">
                {form.billingMethod === "stripe"
                  ? "The client is asked for their card when they activate their account."
                  : "You will record payments by hand and the system sends the client due-date reminders."}
              </span>
            </label>
          )}
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

      {/* Mobile: stacked cards. A six-column table can't work at 390px. */}
      <div className="space-y-3 md:hidden">
        {pageRows.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-surface px-4 py-8 text-center text-sm text-white/40">
            {clients.length === 0
              ? "No clients yet. Create the first one with New Client."
              : "No clients match your search or filters."}
          </p>
        )}
        {pageRows.map((client) => {
          const invite = inviteState(client);
          return (
            <div
              key={client.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/admin-dashboard/clients/${client.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/admin-dashboard/clients/${client.id}`);
              }}
              className="cursor-pointer rounded-2xl border border-white/10 bg-surface p-4 transition-colors active:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/60">
                    {client.email ?? "No email"}
                  </p>
                </div>
                <ProfileStatusBadge status={client.status} />
              </div>
              {client.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span
                  className={`text-xs ${
                    invite.tone === "ok"
                      ? "text-emerald-300"
                      : invite.tone === "warn"
                        ? "text-amber-300"
                        : "text-white/30"
                  }`}
                >
                  {invite.label}
                </span>
                <div className="flex items-center gap-2">
                  {invite.canResend && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        resend(client.id);
                      }}
                      className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                    >
                      {resendingId === client.id ? "Sending..." : "Resend"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(client);
                    }}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                  >
                    {deletingId === client.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-surface md:block">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("name")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Name{sortIndicator("name")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("email")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Email{sortIndicator("email")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("status")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Status{sortIndicator("status")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">Services</th>
              <th className="px-4 py-3 font-bold">Invitation</th>
              <th className="px-4 py-3 text-right font-bold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                  {clients.length === 0
                    ? "No clients yet. Create the first one with New Client."
                    : "No clients match your search or filters."}
                </td>
              </tr>
            )}
            {pageRows.map((client) => {
              const invite = inviteState(client);
              return (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/admin-dashboard/clients/${client.id}`)}
                  className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-bold text-white">
                    {client.first_name} {client.last_name}
                  </td>
                  <td className="px-4 py-3 text-white/70">{client.email ?? "No email"}</td>
                  <td className="px-4 py-3">
                    <ProfileStatusBadge status={client.status} />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            resend(client.id);
                          }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(client);
                      }}
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

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-white/60">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
