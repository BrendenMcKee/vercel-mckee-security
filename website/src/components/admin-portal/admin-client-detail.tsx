"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/portal/database.types";
import {
  deleteClientAction,
  resendInviteAction,
  setClientStatusAction,
  updateClientProfileAction,
} from "@/lib/portal/actions/clients";
import {
  assignServiceAction,
  updateServiceStatusAction,
  updateServiceTierAction,
} from "@/lib/portal/actions/services";
import {
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import { adminInputClass, ProfileStatusBadge, ServiceStatusBadge } from "@/components/admin-portal/ui";

type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "target_email" | "expires_at" | "used_at" | "created_at"
>;

export type AdminClientDetailRow = Tables<"profiles"> & {
  services: Tables<"services">[];
  invitations: InvitationSummary[];
};

type Notice = { kind: "ok" | "error"; text: string; link?: string } | null;

const buttonSecondary =
  "cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50";

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
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
            className={buttonSecondary}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ client }: { client: AdminClientDetailRow }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email ?? "",
    address: client.address ?? "",
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await updateClientProfileAction({ profileId: client.id, ...form });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setEditing(false);
      setNotice({ kind: "ok", text: "Profile saved." });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <ProfileStatusBadge status={client.status} />
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setNotice(null);
          }}
          className={buttonSecondary}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {editing ? (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              First name *
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Last name *
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Address
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Email</dt>
              <dd className="mt-1 text-white/80">{client.email ?? "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Address</dt>
              <dd className="mt-1 text-white/80">{client.address ?? "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Created</dt>
              <dd className="mt-1 text-white/80">
                {new Date(client.created_at).toLocaleDateString("en-CA")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Sign-in</dt>
              <dd className="mt-1 text-white/80">
                {client.user_id ? "Activated" : "Not activated yet"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

function ServicesCard({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignType, setAssignType] = useState<ServiceType | "">("");
  const [assignTier, setAssignTier] = useState("");

  const unassignedTypes = (Object.keys(SERVICE_TIERS) as ServiceType[]).filter(
    (type) => !client.services.some((s) => s.service_type === type),
  );

  function changeTier(service: Tables<"services">, tier: string) {
    if (tier === service.tier) return;
    setNotice(null);
    setBusyId(service.id);
    startTransition(async () => {
      const result = await updateServiceTierAction({ serviceId: service.id, tier });
      setBusyId(null);
      setNotice(
        result.ok
          ? { kind: "ok", text: `${SERVICE_TYPE_LABELS[service.service_type]} tier changed to ${tierLabel(tier)}. The client dashboard reflects this immediately.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function changeStatus(service: Tables<"services">, status: "active" | "paused" | "cancelled") {
    const label = SERVICE_TYPE_LABELS[service.service_type];
    if (status === "cancelled") {
      // Destructive admin action: explicit confirm (handover 14.2).
      const confirmed = window.confirm(`Cancel ${label} for this client?`);
      if (!confirmed) return;
    }
    setNotice(null);
    setBusyId(service.id);
    startTransition(async () => {
      const result = await updateServiceStatusAction({ serviceId: service.id, status });
      setBusyId(null);
      setNotice(
        result.ok
          ? { kind: "ok", text: `${label} is now ${status}.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignType || !assignTier) return;
    setNotice(null);
    startTransition(async () => {
      const result = await assignServiceAction({
        profileId: client.id,
        serviceType: assignType,
        tier: assignTier,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setAssignType("");
      setAssignTier("");
      setNotice({ kind: "ok", text: "Service assigned." });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Services</h2>
      <p className="mt-1 text-xs text-white/40">
        Plan assignment, tier changes, and cancellation are admin-only (R21). Clients see
        these read-only.
      </p>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {client.services.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No services assigned.
          </p>
        )}

        {client.services.map((service) => (
          <div
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-background p-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  {SERVICE_TYPE_LABELS[service.service_type]}
                </span>
                <ServiceStatusBadge status={service.status} />
              </div>
              {service.service_type === "cloud_backup" && (
                <p className="mt-1 text-xs text-white/40">
                  Runs on McKee-managed on-site hardware; footage service ships with Track 2.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={service.tier}
                disabled={pending}
                onChange={(e) => changeTier(service, e.target.value)}
                className={`${adminInputClass} cursor-pointer`}
                aria-label={`${SERVICE_TYPE_LABELS[service.service_type]} tier`}
              >
                {SERVICE_TIERS[service.service_type].map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabel(tier)}
                  </option>
                ))}
              </select>
              {service.status === "cancelled" || service.status === "paused" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus(service, "active")}
                  className={buttonSecondary}
                >
                  {busyId === service.id ? "Working..." : "Restart"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => changeStatus(service, "paused")}
                    className={buttonSecondary}
                  >
                    {busyId === service.id ? "Working..." : "Pause"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => changeStatus(service, "cancelled")}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {unassignedTypes.length > 0 && (
          <form
            onSubmit={assign}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-white/15 p-4"
          >
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Add service
              <select
                value={assignType}
                onChange={(e) => {
                  setAssignType(e.target.value as ServiceType | "");
                  setAssignTier("");
                }}
                className={`${adminInputClass} cursor-pointer`}
              >
                <option value="">Choose...</option>
                {unassignedTypes.map((type) => (
                  <option key={type} value={type}>
                    {SERVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Tier
              <select
                value={assignTier}
                onChange={(e) => setAssignTier(e.target.value)}
                disabled={!assignType}
                className={`${adminInputClass} cursor-pointer disabled:opacity-50`}
              >
                <option value="">Choose...</option>
                {assignType &&
                  SERVICE_TIERS[assignType].map((tier) => (
                    <option key={tier} value={tier}>
                      {tierLabel(tier)}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || !assignType || !assignTier}
              className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
            >
              {pending ? "Assigning..." : "Assign"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function InvitationCard({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  const open = client.invitations.find((inv) => !inv.used_at);
  const used = client.invitations.find((inv) => inv.used_at);

  let stateLine: string;
  if (client.status !== "pending") {
    stateLine = used
      ? `Activated ${new Date(used.used_at!).toLocaleDateString("en-CA")}.`
      : "Account is active.";
  } else if (!open) {
    stateLine = "No open invitation.";
  } else if (new Date(open.expires_at).getTime() <= Date.now()) {
    stateLine = `Invitation expired ${new Date(open.expires_at).toLocaleDateString("en-CA")}.`;
  } else {
    stateLine = `Invitation open, expires ${new Date(open.expires_at).toLocaleDateString("en-CA")}${open.target_email ? `, sent to ${open.target_email}` : ""}.`;
  }

  function resend() {
    setNotice(null);
    startTransition(async () => {
      const result = await resendInviteAction(client.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (!result.emailAttempted) {
        setNotice({ kind: "ok", text: "New invitation created. No email on file, copy the link:", link: result.activateUrl });
      } else if (!result.emailSent) {
        setNotice({ kind: "error", text: "Invitation refreshed, but the email failed to send. Copy the link:", link: result.activateUrl });
      } else {
        setNotice({ kind: "ok", text: "Invitation refreshed and email re-sent." });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Invitation</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">{stateLine}</p>
          {client.status === "pending" && (
            <button type="button" disabled={pending} onClick={resend} className={buttonSecondary}>
              {pending ? "Sending..." : "Resend Invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DangerZone({ client }: { client: AdminClientDetailRow }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  const disabled = client.status === "disabled";
  const name = `${client.first_name} ${client.last_name}`;

  function toggleStatus() {
    const confirmed = window.confirm(
      disabled
        ? `Re-enable ${name}? They will be able to sign in again.`
        : `Disable ${name}? They will be locked out of the portal until re-enabled. Their data is kept.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setClientStatusAction({
        profileId: client.id,
        status: disabled ? "active" : "disabled",
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: disabled ? "Account re-enabled." : "Account disabled." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    const confirmed = window.confirm(
      `Permanently delete ${name}?\n\nThis removes their sign-in, profile, services, and invitations everywhere. This cannot be undone.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteClientAction(client.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      router.push("/admin-dashboard?tab=clients");
    });
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Account Controls</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="flex flex-wrap gap-3">
          {(client.user_id || disabled) && (
            <button type="button" disabled={pending} onClick={toggleStatus} className={buttonSecondary}>
              {disabled ? "Re-enable Account" : "Disable Account"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
          >
            Delete Client
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminClientDetail({ client }: { client: AdminClientDetailRow }) {
  return (
    <div className="space-y-6">
      <ProfileCard client={client} />
      <ServicesCard client={client} />
      <InvitationCard client={client} />
      <DangerZone client={client} />
    </div>
  );
}
