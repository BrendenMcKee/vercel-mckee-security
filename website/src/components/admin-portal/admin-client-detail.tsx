"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/portal/database.types";
import {
  deleteClientAction,
  resendInviteAction,
  setClientStatusAction,
  updateClientProfileAction,
  updateClientLanvacAction,
} from "@/lib/portal/actions/clients";
import {
  assignServiceAction,
  updateServiceStatusAction,
  updateServiceTierAction,
  updateVoipConfigAction,
} from "@/lib/portal/actions/services";
import {
  CLOUD_BACKUP_PLANNED_RETENTION_COPY,
  SERVICE_THEME,
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  hasCurrentMonitoring,
  isServiceAvailable,
  isVoipService,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import {
  addDeviceAction,
  deleteDeviceAction,
  updateDeviceAction,
} from "@/lib/portal/actions/devices";
import { chargeVoipPortFee, recordManualPayment, updateServiceBilling } from "@/lib/portal/actions/payments";
import { deleteSiteConfirmCopy } from "@/lib/portal/delete-site-copy";
import {
  AdminAccountPeople,
  type AdminAccountMember,
} from "@/components/admin-portal/admin-account-people";
import {
  AdminAccountCard,
  type AdminAccountCardAccount,
} from "@/components/admin-portal/admin-account-card";
import { canMintSiteInvitation, inviteDeliveryNotice } from "@/lib/portal/invite-delivery";
import { formatPhone } from "@/lib/portal/phone";
import {
  BILLING_INTERVAL_LABELS,
  PAYMENT_METHOD_LABELS,
  addMonths,
  daysUntil,
  formatCents,
  intervalMonths,
  invoiceSendCents,
  lockedBillingInterval,
  todayIsoDate,
  tierOptionLabel,
  voipCoverageLabel,
  voipInternalCostCents,
  voipMonthlyCents,
  voipPortFeeCents,
  voipUnchargedPorts,
  VOIP_DID_COST_CONFIRMED,
  type BillingInterval,
  type PaymentMethod,
} from "@/lib/portal/billing";
import {
  DEVICE_CATEGORIES,
  DEVICE_CATEGORY_LABELS,
  deviceCategoryLabel,
  deviceExpiryDate,
  isDeviceExpired,
  type DeviceCategory,
} from "@/lib/portal/devices";
import { adminInputClass, adminSelectClass, ProfileStatusBadge, ServiceStatusBadge } from "@/components/admin-portal/ui";
import { CallerIdEditor, type CallerIdContact } from "@/components/portal/caller-id-editor";
import { LANVAC_ACCOUNT_CODE_INPUT_MAX, normalizeLanvacAccountInput } from "@/lib/portal/lanvac";
import { guessLanvacCityFromAddress, lanvacEmergencyNumbers } from "@/lib/portal/lanvac-cities";
import { LanvacCitySelect } from "@/components/admin-portal/lanvac-city-select";
import { LanvacEmergencyReadout } from "@/components/portal/lanvac-emergency-readout";
import {
  LanvacStationReadout,
  type LanvacStationSignal,
  type LanvacStationState,
  type LanvacStationZone,
} from "@/components/portal/lanvac-station-readout";
import { DatePickerInput } from "@/components/portal/date-picker-input";
import { DeviceNameSelect } from "@/components/portal/device-name-select";
import { PortalCard, PortalCardIcon, SERVICE_PORTAL_ICON } from "@/components/portal/portal-card";

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
  "cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50";

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
    phone: client.phone ? formatPhone(client.phone) : "",
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
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
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
              Email *
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(705) 555-0123"
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Service address
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
              <dt className="text-xs uppercase tracking-widest text-white/40">Phone</dt>
              <dd className="mt-1 text-white/80">{client.phone ? formatPhone(client.phone) : "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Service address</dt>
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
                {client.user_id
                  ? "Home login on this site"
                  : "No separate login. People use the account sign-in."}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

export type CardPaymentEntry = {
  id: string;
  serviceId: string | null;
  paidOn: string;
  amountCents: number | null;
};

const CLOUD_BACKUP_AVAILABLE = isServiceAvailable("cloud_backup");

function CloudBackupDevelopmentCard() {
  if (CLOUD_BACKUP_AVAILABLE) return null;

  return (
    <PortalCard
      icon="cloud"
      tone="muted"
      title={SERVICE_TYPE_LABELS.cloud_backup}
      description="Secure off-site retention for IP-camera footage"
      action={
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/65">
          In Development
        </span>
      }
    >
      <p className="text-xs leading-relaxed text-white/45">
        Planned retention options: {CLOUD_BACKUP_PLANNED_RETENTION_COPY}. This
        template will unlock after the camera ingestion and retrieval system is
        ready.
      </p>
      <label className="mt-3 flex max-w-sm flex-col gap-1.5 text-sm text-white/60">
        Retention plan
        <select
          value=""
          disabled
          aria-label="Camera Cloud Backup retention plan, in development"
          className={`${adminSelectClass} cursor-not-allowed text-white/40`}
        >
          <option value="">Available after launch</option>
          {SERVICE_TIERS.cloud_backup.map((tier) => (
            <option key={tier} value={tier}>
              {tierOptionLabel("cloud_backup", tier)}
            </option>
          ))}
        </select>
      </label>
    </PortalCard>
  );
}

function AddServiceForm({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [assignType, setAssignType] = useState<ServiceType | "">("");
  const [assignTier, setAssignTier] = useState("");
  const [assignNumbers, setAssignNumbers] = useState("1");
  const [assignSeats, setAssignSeats] = useState("1");
  const [assignPorts, setAssignPorts] = useState("0");
  const [assignLanvacCode, setAssignLanvacCode] = useState(client.lanvac_account_code ?? "");
  const [assignLanvacCity, setAssignLanvacCity] = useState(
    client.lanvac_city ?? guessLanvacCityFromAddress(client.address ?? "") ?? "",
  );
  const [assignCityLocked, setAssignCityLocked] = useState(Boolean(client.lanvac_city));
  const needsStation = assignType === "monitoring";

  const unassignedTypes = (Object.keys(SERVICE_TIERS) as ServiceType[]).filter(
    (type) =>
      isServiceAvailable(type) &&
      !client.services.some((s) => s.service_type === type),
  );
  if (unassignedTypes.length === 0) return null;

  const voip = assignType === "voip";

  function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignType || !assignTier) return;
    const numberCount = voip ? Number.parseInt(assignNumbers, 10) : 1;
    const seatCount = assignTier === "professional" ? Number.parseInt(assignSeats, 10) : 1;
    const portCount = voip ? Number.parseInt(assignPorts, 10) : 0;
    if (voip && (!Number.isFinite(numberCount) || numberCount < 1)) {
      setNotice({ kind: "error", text: "Enter how many phone numbers this system includes." });
      return;
    }
    if (assignTier === "professional" && (!Number.isFinite(seatCount) || seatCount < 1)) {
      setNotice({ kind: "error", text: "Enter how many user seats this system includes." });
      return;
    }
    if (voip && Number.isFinite(portCount) && portCount > numberCount) {
      setNotice({ kind: "error", text: "Numbers being ported cannot exceed the numbers on the system." });
      return;
    }
    if (needsStation && (!assignLanvacCode.trim() || !assignLanvacCity.trim())) {
      setNotice({
        kind: "error",
        text: "Security monitoring needs a Lanvac account number and a dispatch city.",
      });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await assignServiceAction({
        profileId: client.id,
        serviceType: assignType,
        tier: assignTier,
        numberCount,
        seatCount,
        portCount: Number.isFinite(portCount) ? Math.max(0, portCount) : 0,
        ...(needsStation
          ? { lanvacAccountCode: assignLanvacCode, lanvacCity: assignLanvacCity }
          : {}),
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setAssignType("");
      setAssignTier("");
      setAssignNumbers("1");
      setAssignSeats("1");
      setAssignPorts("0");
      setNotice({ kind: "ok", text: "Service added. Set up its billing below." });
    });
  }

  return (
    <div className="space-y-3">
      <NoticeBanner notice={notice} />
      <form
        onSubmit={assign}
        className="grid gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Add service
          <select
            value={assignType}
            onChange={(e) => {
              const type = e.target.value as ServiceType | "";
              setAssignType(type);
              setAssignTier("");
              if (type === "monitoring" && !assignCityLocked) {
                const guessed = guessLanvacCityFromAddress(client.address ?? "");
                if (guessed) setAssignLanvacCity(guessed);
              }
            }}
            className={`${adminSelectClass} max-w-full`}
          >
            <option value="">Choose...</option>
            {unassignedTypes.map((type) => (
              <option key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Plan
          <select
            value={assignTier}
            onChange={(e) => setAssignTier(e.target.value)}
            disabled={!assignType}
            className={`${adminSelectClass} max-w-full disabled:opacity-50`}
          >
            <option value="">Choose...</option>
            {assignType &&
              SERVICE_TIERS[assignType].map((tier) => (
                <option key={tier} value={tier}>
                  {tierOptionLabel(assignType, tier)}
                </option>
              ))}
          </select>
        </label>
        <label
          className={`flex min-w-0 flex-col gap-1.5 text-sm transition-opacity ${voip ? "text-white/80" : "pointer-events-none text-white/80 opacity-40"}`}
        >
          Numbers
          <input
            type="number"
            min={1}
            max={100}
            disabled={!voip}
            value={assignNumbers}
            onChange={(e) => setAssignNumbers(e.target.value)}
            className={`${adminInputClass} sm:w-24`}
          />
        </label>
        <label
          className={`flex min-w-0 flex-col gap-1.5 text-sm transition-opacity ${
            assignTier === "professional" ? "text-white/80" : "pointer-events-none text-white/80 opacity-40"
          }`}
        >
          Seats
          <input
            type="number"
            min={1}
            max={100}
            disabled={assignTier !== "professional"}
            value={assignTier === "residential" ? "1" : assignSeats}
            onChange={(e) => setAssignSeats(e.target.value)}
            className={`${adminInputClass} sm:w-24`}
          />
        </label>
        <label
          className={`flex min-w-0 flex-col gap-1.5 text-sm transition-opacity ${voip ? "text-white/80" : "pointer-events-none text-white/80 opacity-40"}`}
        >
          Ports
          <input
            type="number"
            min={0}
            max={Number.parseInt(assignNumbers, 10) || 1}
            disabled={!voip}
            value={assignPorts}
            onChange={(e) => setAssignPorts(e.target.value)}
            className={`${adminInputClass} sm:w-24`}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !assignType || !assignTier}
          className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add Service"}
        </button>
        {needsStation && (
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Lanvac account number *
              <input
                required
                value={assignLanvacCode}
                onChange={(e) => setAssignLanvacCode(normalizeLanvacAccountInput(e.target.value))}
                placeholder="O5985"
                maxLength={LANVAC_ACCOUNT_CODE_INPUT_MAX}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Dispatch city *
              <LanvacCitySelect
                required
                value={assignLanvacCity}
                onChange={(city) => {
                  setAssignLanvacCity(city);
                  setAssignCityLocked(Boolean(city));
                }}
              />
            </label>
            <div className="sm:col-span-2">
              <LanvacEmergencyReadout
                city={assignLanvacCity}
                numbers={lanvacEmergencyNumbers(assignLanvacCity)}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function InvitationCard({
  client,
  siblingSiteCount,
}: {
  client: AdminClientDetailRow;
  siblingSiteCount: number;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  const open = client.invitations.find((inv) => !inv.used_at);
  const used = client.invitations.find((inv) => inv.used_at);

  let stateLine: string;
  const showResend = canMintSiteInvitation({
    status: client.status,
    hasOpenInvite: Boolean(open),
    accountSiteCount: siblingSiteCount + 1,
  });

  if (client.status !== "pending") {
    stateLine = used
      ? `Activated ${new Date(used.used_at!).toLocaleDateString("en-CA")}.`
      : siblingSiteCount > 0
        ? "This site is active. The Account admin already has access. No invitation was created."
        : "Account is active.";
  } else if (!open) {
    stateLine =
      siblingSiteCount > 0
        ? "No open invitation. Added sites do not get their own house invite."
        : "No open invitation.";
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
      const delivery = inviteDeliveryNotice(result, "resent");
      setNotice({
        kind: delivery.kind,
        text: delivery.text,
        link: delivery.showLink ? result.activateUrl : undefined,
      });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Invitation</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">{stateLine}</p>
          {showResend && (
            <button type="button" disabled={pending} onClick={resend} className={buttonSecondary}>
              {pending ? "Sending..." : "Resend Invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DangerZone({
  client,
  siblingSiteCount,
}: {
  client: AdminClientDetailRow;
  siblingSiteCount: number;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const disabled = client.status === "disabled";
  const name = `${client.first_name} ${client.last_name}`;
  const deleteCopy = deleteSiteConfirmCopy({ siteName: name, siblingSiteCount });
  const nameMatches =
    confirmName.trim().replace(/\s+/g, " ").toLowerCase() ===
    name.trim().replace(/\s+/g, " ").toLowerCase();

  function toggleStatus() {
    const confirmed = window.confirm(
      disabled
        ? `Re-enable this site (${name})? People who have access can open it again.`
        : `Disable this site (${name})? People who still have another active site can keep using those. This site stays in the database; card payments keep running.`,
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
          ? { kind: "ok", text: disabled ? "Site re-enabled. People who have access can open it again." : "Site disabled. Other sites on this login are unchanged." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    if (!nameMatches) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteClientAction({ profileId: client.id, confirmName });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      router.push("/admin-dashboard?tab=clients");
    });
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Account Controls</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-background p-4">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-white">
              {disabled ? "Re-enable this site" : "Disable this site"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {disabled
                ? "This site is currently disabled. Re-enabling lets people who have access open it again; everything is exactly as they left it."
                : "Turns this site off in the portal. People who still have another active site can keep using those. Nothing is removed: services, billing, contact list, and history stay, and automatic card payments keep running."}
            </p>
          </div>
          <button type="button" disabled={pending} onClick={toggleStatus} className={buttonSecondary}>
            {disabled ? "Re-enable site" : "Disable site"}
          </button>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-white">{deleteCopy.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{deleteCopy.body}</p>
            </div>
            {!confirmingDelete && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmingDelete(true);
                  setConfirmName("");
                  setNotice(null);
                }}
                className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
              >
                Delete this site...
              </button>
            )}
          </div>

          {confirmingDelete && (
            <div className="mt-4 space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-white/80">
                {deleteCopy.confirmLead}{" "}
                <span className="font-bold text-white">{name}</span>
              </p>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={name}
                autoComplete="off"
                className={`${adminInputClass} w-full max-w-md`}
                aria-label="Type the site name to confirm deletion"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={pending || !nameMatches}
                  onClick={remove}
                  className="cursor-pointer rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-default disabled:opacity-40"
                >
                  {pending ? "Deleting..." : deleteCopy.confirmButton}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setConfirmName("");
                  }}
                  className={buttonSecondary}
                >
                  {deleteCopy.keepButton}
                </button>
                {confirmName.trim() !== "" && !nameMatches && (
                  <p className="text-xs text-white/45">The name does not match yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services & Billing (merged, stakeholder round 3): one box per service holds
// the plan (what they have) and the billing (how they pay) together. Plan
// changes on autopay swap the Stripe subscription price; the custom rate and
// interval inputs only exist on the manual rail because on autopay the plan's
// Stripe price is what actually gets charged.
// ---------------------------------------------------------------------------

function ServiceRow({ service }: { service: Tables<"services"> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<"stripe" | "manual">(service.billing_method);
  const lockedCycle = lockedBillingInterval(service.service_type);
  const [cycle, setCycle] = useState<BillingInterval>(lockedCycle ?? service.billing_interval);
  const [amount, setAmount] = useState(
    service.monthly_amount_cents != null ? (service.monthly_amount_cents / 100).toFixed(2) : "",
  );
  const [dueOn, setDueOn] = useState(
    service.next_due_on ?? (service.billing_method === "manual" ? todayIsoDate() : ""),
  );
  const [dueOnTouched, setDueOnTouched] = useState(Boolean(service.next_due_on));
  const [numbers, setNumbers] = useState(String(service.number_count));
  const [seats, setSeats] = useState(String(service.seat_count));
  const [ports, setPorts] = useState(String(service.port_count));

  const voip = isVoipService(service.service_type);
  const unchargedPorts = voip
    ? voipUnchargedPorts(service.port_count, service.port_fee_charged_count)
    : 0;

  // Prefill the received amount with one full invoice (monthly rate x
  // interval, pre-tax); the admin adjusts for tax or partial payments.
  const [payAmount, setPayAmount] = useState(
    service.monthly_amount_cents != null
      ? (invoiceSendCents(service.monthly_amount_cents, lockedCycle ?? service.billing_interval) / 100).toFixed(2)
      : "",
  );
  const [payMethod, setPayMethod] = useState<PaymentMethod>("etransfer");
  const [payDate, setPayDate] = useState(todayIsoDate);
  const [payNote, setPayNote] = useState("");

  const serviceLabel = SERVICE_TYPE_LABELS[service.service_type];

  function changeTier(tier: string) {
    if (tier === service.tier) return;
    setNotice(null);
    startTransition(async () => {
      const result = await updateServiceTierAction({ serviceId: service.id, tier });
      setNotice(
        result.ok
          ? {
              kind: "ok",
              text: `Plan changed to ${tierLabel(tier)}.${
                service.stripe_subscription_id
                  ? " Their automatic card payments now charge the new plan's rate; the next invoice reflects it."
                  : " The client dashboard reflects this immediately."
              }`,
            }
          : { kind: "error", text: result.error },
      );
    });
  }

  function saveVoipConfig() {
    const numberCount = Number.parseInt(numbers, 10);
    const seatCount = service.tier === "residential" ? 1 : Number.parseInt(seats, 10);
    const portCount = Number.parseInt(ports, 10);
    if (!Number.isFinite(numberCount) || numberCount < 1) {
      setNotice({ kind: "error", text: "Enter how many phone numbers this system includes." });
      return;
    }
    if (!Number.isFinite(seatCount) || seatCount < 1) {
      setNotice({ kind: "error", text: "Enter how many user seats this system includes." });
      return;
    }
    if (!Number.isFinite(portCount) || portCount < 0) {
      setNotice({ kind: "error", text: "Enter how many numbers are being ported, or 0." });
      return;
    }
    if (portCount > numberCount) {
      setNotice({ kind: "error", text: "Numbers being ported cannot exceed the numbers on the system." });
      return;
    }
    if (
      numberCount === service.number_count &&
      seatCount === service.seat_count &&
      portCount === service.port_count
    ) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await updateVoipConfigAction({
        serviceId: service.id,
        numberCount,
        seatCount,
        portCount,
      });
      setNotice(
        result.ok
          ? {
              kind: "ok",
              text: `Now ${voipCoverageLabel({ tier: service.tier, numberCount, seatCount })}.${
                service.stripe_subscription_id
                  ? " Their automatic card payments charge the new monthly total from the next invoice."
                  : ""
              }`,
            }
          : { kind: "error", text: result.error },
      );
    });
  }

  function chargePortFee() {
    if (
      numbers !== String(service.number_count) ||
      seats !== String(service.seat_count) ||
      ports !== String(service.port_count)
    ) {
      setNotice({ kind: "error", text: "Save the VoIP numbers, seats, and ports before charging the port fee." });
      return;
    }
    const uncharged = unchargedPorts;
    if (uncharged < 1) {
      setNotice({ kind: "error", text: "The port fee for those numbers is already recorded." });
      return;
    }
    const confirmed = window.confirm(
      `Charge the one-time number port fee of ${formatCents(voipPortFeeCents(uncharged))} plus tax for ${uncharged} number${uncharged === 1 ? "" : "s"}? This is not part of the monthly subscription.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await chargeVoipPortFee({ serviceId: service.id });
      setNotice(
        result.ok
          ? { kind: "ok", text: "Port fee recorded. It does not change the next monthly due date." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function changeStatus(status: "active" | "paused" | "cancelled") {
    if (status === "cancelled") {
      const cardNote = service.stripe_subscription_id
        ? " They stay paid through the current period. Stripe stops charging at the end of that period (not immediately)."
        : "";
      const confirmed = window.confirm(`Cancel ${serviceLabel} for this client?${cardNote}`);
      if (!confirmed) return;
    }
    if (status === "paused") {
      const confirmed = window.confirm(
        service.stripe_subscription_id
          ? `Hold billing for ${serviceLabel}?\n\nThis is not Cancel. Stripe keeps their subscription and stops charging. Restart later and they do not have to enter their card again. Use Cancel if this service is ending.`
          : `Hold billing for ${serviceLabel}?\n\nThis is not Cancel. Reminders stop until you Restart. Use Cancel if this service is ending.`,
      );
      if (!confirmed) return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await updateServiceStatusAction({ serviceId: service.id, status });
      setNotice(
        result.ok
          ? { kind: "ok", text: result.message ?? `${serviceLabel} is now ${status}.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function saveBilling() {
    setNotice(null);
    // On autopay the amount stays whatever the plan sets; only manual billing
    // takes a hand-entered rate.
    const cents =
      method === "stripe"
        ? service.monthly_amount_cents
        : amount.trim()
          ? Math.round(Number.parseFloat(amount) * 100)
          : null;
    if (method === "manual" && amount.trim() && (!Number.isFinite(cents) || cents! <= 0)) {
      setNotice({ kind: "error", text: "Enter a valid monthly amount." });
      return;
    }
    // Moving off autopay stops the client's card subscription in Stripe;
    // confirm because it changes how they get billed from today.
    if (method === "manual" && service.billing_method === "stripe" && service.stripe_subscription_id) {
      const confirmed = window.confirm(
        "Switch this client to manual billing?\n\nTheir automatic card payments will be stopped in Stripe. They are paid through the current period; after that you collect payments yourself (the system will send them due-date reminders).",
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      const result = await updateServiceBilling({
        serviceId: service.id,
        billingMethod: method,
        billingInterval: method === "stripe" ? service.billing_interval : (lockedCycle ?? cycle),
        monthlyAmountCents: cents,
        nextDueOn: method === "stripe" ? "" : dueOn,
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: result.message ?? "Billing settings saved." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const cents = Math.round(Number.parseFloat(payAmount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setNotice({ kind: "error", text: "Enter the amount that was received." });
      return;
    }
    startTransition(async () => {
      const result = await recordManualPayment({
        serviceId: service.id,
        amountCents: cents,
        method: payMethod,
        paidOn: payDate,
        note: payNote.trim() || undefined,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setPayNote("");
      setNotice({
        kind: "ok",
        text: `Payment recorded.${result.nextDueOn ? ` Next due ${result.nextDueOn}.` : ""}${
          result.emailPaused
            ? " Confirmation email is held until go-live."
            : result.emailSent === false
              ? " Confirmation email failed to send."
              : result.emailSent
                ? " Client emailed a confirmation."
                : ""
        }`,
      });
    });
  }

  const invoiceCents =
    service.monthly_amount_cents != null
      ? service.monthly_amount_cents * intervalMonths(service.billing_interval)
      : null;
  const billingCycle = lockedCycle ?? service.billing_interval;
  const invoiceIsDue = !service.next_due_on || daysUntil(service.next_due_on) <= 0;
  const afterThisPayment = service.next_due_on
    ? addMonths(service.next_due_on, intervalMonths(billingCycle))
    : null;

  return (
    <div className={`space-y-4 rounded-xl border bg-background p-4 sm:p-5 ${SERVICE_THEME[service.service_type].card}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PortalCardIcon
            icon={SERVICE_PORTAL_ICON[service.service_type]}
            tone={service.service_type}
          />
          <span className="font-bold text-white">{serviceLabel}</span>
          <ServiceStatusBadge status={service.status} withIcon />
        </div>
        <span className="text-xs uppercase tracking-widest text-white/40">
          {service.billing_method === "stripe"
            ? service.stripe_subscription_id
              ? "Card on file, pays automatically"
              : "Card payments chosen, card not set up yet"
            : "Paid by e-Transfer / cheque / cash"}
        </span>
      </div>

      <NoticeBanner notice={notice} />

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Plan
          <select
            value={service.tier}
            disabled={pending || service.status === "cancelled"}
            onChange={(e) => changeTier(e.target.value)}
            className={`${adminSelectClass} max-w-full disabled:opacity-40`}
            aria-label={`${serviceLabel} plan`}
          >
            {SERVICE_TIERS[service.service_type].map((tier) => (
              <option key={tier} value={tier}>
                {tierOptionLabel(service.service_type, tier)}
              </option>
            ))}
          </select>
        </label>
        {voip && (
          <>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
              Numbers
              <input
                type="number"
                min={1}
                max={100}
                value={numbers}
                disabled={service.status === "cancelled"}
                onChange={(e) => setNumbers(e.target.value)}
                className={`${adminInputClass} sm:w-24 disabled:opacity-40`}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
              Seats
              <input
                type="number"
                min={1}
                max={100}
                disabled={service.tier === "residential" || service.status === "cancelled"}
                value={service.tier === "residential" ? "1" : seats}
                onChange={(e) => setSeats(e.target.value)}
                className={`${adminInputClass} sm:w-24 disabled:opacity-40`}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
              Ports
              <input
                type="number"
                min={0}
                max={Number.parseInt(numbers, 10) || service.number_count}
                value={ports}
                disabled={service.status === "cancelled"}
                onChange={(e) => setPorts(e.target.value)}
                className={`${adminInputClass} sm:w-24 disabled:opacity-40`}
              />
            </label>
            {(numbers !== String(service.number_count) ||
              seats !== String(service.seat_count) ||
              ports !== String(service.port_count)) && (
              <button type="button" disabled={pending} onClick={saveVoipConfig} className={buttonSecondary}>
                {pending ? "Saving..." : "Save VoIP"}
              </button>
            )}
          </>
        )}
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center gap-2 sm:items-end sm:gap-3">
            {service.status === "cancelled" || service.status === "paused" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => changeStatus("active")}
                className={buttonSecondary}
              >
                Restart
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus("paused")}
                  className={buttonSecondary}
                >
                  Hold billing
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus("cancelled")}
                  className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          <p className="text-xs leading-relaxed text-white/45">
            {service.status === "paused"
              ? service.stripe_subscription_id
                ? "On hold: Stripe is not charging, but their card subscription is still there. Restart resumes the same card. They do not enter card details again."
                : "On hold: reminders are stopped. Restart starts reminders again. This is not Cancel."
              : service.status === "cancelled"
                ? service.stripe_subscription_id
                  ? "Cancelled: they stay paid through the current period, then Stripe ends the subscription. Restart before that date keeps the same card. After that date they set up automatic payments again."
                  : "Cancelled: this service is ended. Restart turns it back on. If they pay by card, they will need to set up automatic payments again."
                : service.stripe_subscription_id
                  ? "Hold billing stops charges but keeps their Stripe subscription, so Restart does not make them enter a card again. Cancel ends the service: they stay paid through the current period, then Stripe stops. Use Hold for a temporary stop; use Cancel if this service is ending."
                  : "Hold billing stops reminders until you Restart. Cancel ends the service. Use Hold for a temporary stop; use Cancel if this service is ending."}
          </p>
        </div>
        {service.service_type === "cloud_backup" && (
          <p className="w-full text-xs text-white/40">
            Runs on McKee-managed on-site hardware; footage service ships with Track 2.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            How they pay
            <select
              value={method}
              onChange={(e) => {
                const next = e.target.value as "stripe" | "manual";
                setMethod(next);
                if (next === "manual" && !dueOnTouched) {
                  setDueOn(service.next_due_on || todayIsoDate());
                }
              }}
              className={`${adminSelectClass} max-w-full`}
            >
              <option value="stripe">Automatic card payments</option>
              <option value="manual">e-Transfer / cheque / cash</option>
            </select>
          </label>
          {method === "manual" && (
            <>
              {lockedCycle ? (
                <p className="text-sm text-white/60 sm:self-end sm:pb-2">
                  {lockedCycle === "annual"
                    ? "Billed once a year"
                    : "Billed every month"}
                </p>
              ) : (
                <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                  Billed
                  <select
                    value={cycle}
                    onChange={(e) => {
                      const next = e.target.value as BillingInterval;
                      setCycle(next);
                      if (!dueOnTouched) setDueOn(todayIsoDate());
                    }}
                    className={`${adminSelectClass} max-w-full`}
                  >
                    {(Object.keys(BILLING_INTERVAL_LABELS) as BillingInterval[]).map((value) => (
                      <option key={value} value={value}>
                        {BILLING_INTERVAL_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                Monthly rate ($, before tax)
                <input
                  inputMode="decimal"
                  placeholder="34.95"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={adminInputClass}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                Next payment due
                <DatePickerInput
                  value={dueOn}
                  onChange={(value) => {
                    setDueOnTouched(true);
                    setDueOn(value);
                  }}
                  className={adminInputClass}
                />
              </label>
            </>
          )}
          <button type="button" disabled={pending} onClick={saveBilling} className={buttonSecondary}>
            {pending ? "Saving..." : "Save Billing"}
          </button>
          {method === "manual" && (
            <p className="w-full text-xs leading-relaxed text-white/40">
              {(lockedCycle ?? cycle) === "annual" &&
              amount.trim() &&
              Number.isFinite(Number.parseFloat(amount))
                ? `Yearly invoice: $${(Number.parseFloat(amount) * 12).toFixed(2)} plus tax. `
                : null}
              Save Billing only stores how they pay and when the next invoice
              is due. It does not record money. Leave the date as today if they
              owe this invoice now; set a later date if they are already paid
              ahead.
            </p>
          )}
        </div>

        {method === "stripe" && (
          <div className="rounded-lg border border-white/10 bg-surface/60 p-3 text-xs leading-relaxed text-white/50">
            <p>
              {invoiceCents != null && (
                <>
                  Charges{" "}
                  <span className="font-semibold text-white/80">
                    {formatCents(invoiceCents)} plus tax
                    {service.billing_interval === "annual" ? " per year" : " per month"}
                  </span>
                  {voip &&
                    ` for ${voipCoverageLabel({
                      tier: service.tier,
                      numberCount: service.number_count,
                      seatCount: service.seat_count,
                    })}`}
                  {". "}
                </>
              )}
              The rate comes from the plan above; changing the plan updates the
              card charge automatically. There is nothing to type in here.
            </p>
            {service.next_due_on && (
              <p className="mt-1">
                Next automatic payment: <span className="text-white/80">{service.next_due_on}</span>
              </p>
            )}
            {service.billing_method === "stripe" && !service.stripe_subscription_id && (
              <p className="mt-1">
                The client sees a &ldquo;Set up automatic payments&rdquo; button
                on their dashboard until they enter their card.
              </p>
            )}
          </div>
        )}

        {voip && (
          <div className="space-y-2 rounded-lg border border-white/10 bg-surface/40 p-3 text-xs leading-relaxed text-white/50">
            <p>
              Monthly total is one line:{" "}
              <span className="font-semibold text-white/80">
                {formatCents(
                  voipMonthlyCents({
                    tier: service.tier,
                    numberCount: service.number_count,
                    seatCount: service.seat_count,
                  }),
                )}{" "}
                plus tax
              </span>
              . Phones add nothing. Internal cost {formatCents(
                voipInternalCostCents({
                  tier: service.tier,
                  numberCount: service.number_count,
                  seatCount: service.seat_count,
                }),
              )}
              /month
              {VOIP_DID_COST_CONFIRMED ? "" : " (DID cost unconfirmed, treated as $0.00)"}. Never shown to the client.
            </p>
            {service.port_count > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {unchargedPorts > 0 ? (
                  <>
                    <p>
                      Port fee due: {formatCents(voipPortFeeCents(unchargedPorts))} plus tax for{" "}
                      {unchargedPorts} number{unchargedPorts === 1 ? "" : "s"}, one time.
                    </p>
                    <button
                      type="button"
                      disabled={pending || service.status === "paused"}
                      onClick={chargePortFee}
                      className={buttonSecondary}
                    >
                      {pending ? "Charging..." : "Charge port fee"}
                    </button>
                  </>
                ) : (
                  <p>
                    Port fee already recorded for {service.port_fee_charged_count} number
                    {service.port_fee_charged_count === 1 ? "" : "s"}. Raise the port count if more
                    numbers are being ported.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {service.billing_method === "manual" && (
        <ManualPaymentFields
          invoiceIsDue={invoiceIsDue}
          dueOn={service.next_due_on}
          afterThisPayment={afterThisPayment}
          billingCycle={billingCycle}
          pending={pending}
          payAmount={payAmount}
          setPayAmount={setPayAmount}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          payDate={payDate}
          setPayDate={setPayDate}
          payNote={payNote}
          setPayNote={setPayNote}
          onSubmit={recordPayment}
        />
      )}
    </div>
  );
}

function ManualPaymentFields({
  invoiceIsDue,
  dueOn,
  afterThisPayment,
  billingCycle,
  pending,
  payAmount,
  setPayAmount,
  payMethod,
  setPayMethod,
  payDate,
  setPayDate,
  payNote,
  setPayNote,
  onSubmit,
}: {
  invoiceIsDue: boolean;
  dueOn: string | null;
  afterThisPayment: string | null;
  billingCycle: BillingInterval;
  pending: boolean;
  payAmount: string;
  setPayAmount: (value: string) => void;
  payMethod: PaymentMethod;
  setPayMethod: (value: PaymentMethod) => void;
  payDate: string;
  setPayDate: (value: string) => void;
  payNote: string;
  setPayNote: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const fields = (
    <>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
        Amount ($)
        <input
          inputMode="decimal"
          required
          value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)}
          className={adminInputClass}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
        Method
        <select
          value={payMethod}
          onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
          className={`${adminSelectClass} max-w-full`}
        >
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
        Received on
        <DatePickerInput required value={payDate} onChange={setPayDate} className={adminInputClass} />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:min-w-[12rem] sm:flex-1">
        Note
        <input
          placeholder="e.g. e-Transfer ref 12345"
          maxLength={300}
          value={payNote}
          onChange={(e) => setPayNote(e.target.value)}
          className={adminInputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
      >
        {pending ? "Recording..." : "Record Payment"}
      </button>
    </>
  );

  if (invoiceIsDue) {
    return (
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl border border-dashed border-emerald-500/25 bg-emerald-500/5 p-4 sm:flex sm:flex-wrap sm:items-end"
      >
        <div className="w-full space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            When the payment arrives
          </p>
          <p className="text-xs leading-relaxed text-white/50">
            This invoice is due {dueOn ?? "today"}. Saving billing does not
            record money. Use this after the e-transfer, cheque, or cash
            arrives
            {afterThisPayment
              ? `. That moves the next due date to ${afterThisPayment}`
              : billingCycle === "annual"
                ? ". That moves the next due date forward one year"
                : ". That moves the next due date forward one month"}
            .
          </p>
        </div>
        {fields}
      </form>
    );
  }

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-white/45">
        Record a later payment (next invoice {dueOn})
      </summary>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <p className="w-full text-xs leading-relaxed text-white/45">
          They are paid through {dueOn}. Only open this when a new payment
          arrives. Recording one now will move the next due date to{" "}
          {afterThisPayment}.
        </p>
        {fields}
      </form>
    </details>
  );
}

function ServicesBillingCard({
  client,
  manualPayments,
  cardPayments,
  cloudBackupInterest,
}: {
  client: AdminClientDetailRow;
  manualPayments: Tables<"manual_payments">[];
  cardPayments: CardPaymentEntry[];
  cloudBackupInterest: Tables<"cloud_backup_interest"> | null;
}) {
  const serviceLabel = (serviceId: string | null) => {
    const service = serviceId ? client.services.find((s) => s.id === serviceId) : null;
    return service ? SERVICE_TYPE_LABELS[service.service_type] : "Removed service";
  };

  // One combined history, newest first: hand-recorded payments and automatic
  // card payments side by side, the same view the client sees.
  const history = [
    ...manualPayments.map((payment) => ({
      key: `m-${payment.id}`,
      paidOn: payment.paid_on,
      amountCents: payment.amount_cents as number | null,
      how: PAYMENT_METHOD_LABELS[payment.method],
      service: serviceLabel(payment.service_id),
      note: payment.note,
      recordedBy: payment.recorded_by_email,
    })),
    ...cardPayments.map((payment) => ({
      key: `c-${payment.id}`,
      paidOn: payment.paidOn,
      amountCents: payment.amountCents,
      how: "Card (automatic)",
      service: serviceLabel(payment.serviceId),
      note: null as string | null,
      recordedBy: null as string | null,
    })),
  ].sort((a, b) => b.paidOn.localeCompare(a.paidOn));

  return (
    <PortalCard
      icon="card"
      tone="billing"
      title="Services & Billing"
      description="Each service keeps its product color: red for monitoring, teal for VoIP, sky for Camera Cloud Backup. Only McKee can change plans. Recorded payments cannot be edited afterwards; a correcting entry (including a negative amount) works."
    >
      {cloudBackupInterest &&
        !client.services.some(
          (service) =>
            service.service_type === "cloud_backup" &&
            service.status !== "cancelled",
        ) && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Camera Cloud Backup Interest
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/80">
              This client asked to be contacted when Camera Cloud Backup becomes
              available. Opted in{" "}
              {new Date(cloudBackupInterest.consented_at).toLocaleDateString(
                "en-CA",
                {
                  timeZone: "America/Toronto",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}{" "}
              using {cloudBackupInterest.email}.
            </p>
          </div>
        )}

      <div className="mt-4 space-y-4">
        {client.services.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No services yet. Add one below.
          </p>
        )}
        {client.services.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}

        {!client.services.some(
          (service) => service.service_type === "cloud_backup",
        ) && <CloudBackupDevelopmentCard />}

        <AddServiceForm client={client} />

        {history.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Payment history
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {history.map((payment) => (
                <li key={payment.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-white/80">
                    <span className="font-bold text-white">
                      {payment.amountCents != null ? formatCents(payment.amountCents) : "Payment"}
                    </span>
                    {" "}&middot; {payment.how} &middot; {payment.service}
                    {payment.note && <span className="text-white/40"> &middot; {payment.note}</span>}
                  </span>
                  <span className="text-xs text-white/40">
                    {payment.paidOn}
                    {payment.recordedBy && ` · by ${payment.recordedBy}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PortalCard>
  );
}

// ---------------------------------------------------------------------------
// Phase 4: caller ID card (R23 admin-assisted changes with R24 audit trail)
// and the immutable change history.
// ---------------------------------------------------------------------------

const AUTHORIZED_VIA_LABELS: Record<string, string> = {
  client_email: "client email",
  client_verbal: "verbal request",
  client_in_person: "in person",
  mckee_initiated: "McKee-initiated",
};

type DiffEntry = {
  phone: string;
  label: string;
  passcode?: string | null;
  sort_order?: number;
  from_order?: number;
  to_order?: number;
};

function HistoryDiffList({
  entries,
  kind,
}: {
  entries: DiffEntry[];
  kind: "added" | "removed" | "moved";
}) {
  if (entries.length === 0) return null;
  const color = kind === "added" ? "text-emerald-300" : kind === "removed" ? "text-red-300" : "text-sky-300";
  const sign = kind === "added" ? "+" : kind === "removed" ? "−" : "~";
  return (
    <>
      {entries.map((entry) => (
        <p key={`${kind}-${entry.phone}-${entry.label}-${entry.from_order ?? ""}-${entry.to_order ?? ""}`} className={`text-sm ${color}`}>
          {sign}{" "}
          {entry.to_order != null ? `#${entry.to_order} ` : entry.sort_order != null ? `#${entry.sort_order} ` : ""}
          {entry.label} <span className="text-white/50">{formatPhone(entry.phone)}</span>
          {entry.passcode && (
            <span className="text-white/40"> &middot; passcode: {entry.passcode}</span>
          )}
          {kind === "moved" && entry.from_order != null && (
            <span className="text-sky-200/70"> (was #{entry.from_order})</span>
          )}
        </p>
      ))}
    </>
  );
}

function staffMonitoringHeaderCopy(tier: string): string {
  switch (tier) {
    case "landline":
      return "This system reports to the monitoring station over a land line. If it goes off, they call the contact list in order.";
    case "cellular":
      return "This system reports over a cellular communicator. If it goes off, the station calls the contact list in order.";
    case "cellular_tc":
      return "Cellular communicator plus Total Connect 2.0 app control. If it goes off, the station calls the contact list in order.";
    case "cellular_tc_home":
      return "Cellular communicator, Total Connect 2.0, and home automation. If it goes off, the station calls the contact list in order.";
    default:
      return "If this system goes off, the monitoring station calls the contact list in order.";
  }
}

function AdminSecurityHeader({ client }: { client: AdminClientDetailRow }) {
  const monitoring = client.services.find(
    (service) => service.service_type === "monitoring" && service.status !== "cancelled",
  );
  const stationBits = [
    client.lanvac_account_code ? `Lanvac ${client.lanvac_account_code}` : null,
    client.lanvac_city,
  ].filter(Boolean);

  return (
    <header className="border-b border-white/10 pb-8 pt-4 sm:pb-10 sm:pt-6">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <PortalCardIcon icon="shield" tone="monitoring" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
              Security system
            </h2>
            {monitoring && <ServiceStatusBadge status={monitoring.status} withIcon />}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/50">
            {monitoring
              ? `${tierLabel(monitoring.tier)} · ${SERVICE_TYPE_LABELS.monitoring}`
              : "Contacts and equipment on file"}
            {stationBits.length > 0 ? ` · ${stationBits.join(" · ")}` : ""}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            {monitoring
              ? staffMonitoringHeaderCopy(monitoring.tier)
              : "There is no current monitoring plan on this account. Station details, contacts, and leftover zone data stay here so staff can still review them."}
          </p>
        </div>
      </div>
    </header>
  );
}

function MonitoringStationCard({ client }: { client: AdminClientDetailRow }) {
  const router = useRouter();
  const hasMonitoring = hasCurrentMonitoring(client.services);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    lanvacAccountCode: client.lanvac_account_code ?? "",
    lanvacCity: client.lanvac_city ?? "",
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const displayCity = editing ? form.lanvacCity : (client.lanvac_city ?? "");
  const missingStation =
    hasMonitoring && (!client.lanvac_account_code || !client.lanvac_city);

  function resetForm() {
    setForm({
      lanvacAccountCode: client.lanvac_account_code ?? "",
      lanvacCity:
        client.lanvac_city ?? guessLanvacCityFromAddress(client.address ?? "") ?? "",
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await updateClientLanvacAction({
        profileId: client.id,
        lanvacAccountCode: form.lanvacAccountCode,
        lanvacCity: form.lanvacCity,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setEditing(false);
      setNotice({ kind: "ok", text: "Monitoring station saved." });
      router.refresh();
    });
  }

  return (
    <PortalCard
      icon="shield"
      tone="monitoring"
      title="Monitoring station"
      description="Lanvac account number and the city they use for police, fire, and ambulance. Those numbers stay at the station. Zones and signals below are for this account."
      action={
        <button
          type="button"
          onClick={() => {
            resetForm();
            setEditing((v) => !v);
            setNotice(null);
          }}
          className={buttonSecondary}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      }
    >
      {missingStation && (
        <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Required for this monitoring account: set the Lanvac account number
          and dispatch city.
        </p>
      )}

      <div className="space-y-3">
        <NoticeBanner notice={notice} />
        {editing ? (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Lanvac account number {hasMonitoring ? "*" : ""}
              <input
                required={hasMonitoring}
                value={form.lanvacAccountCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    lanvacAccountCode: normalizeLanvacAccountInput(e.target.value),
                  }))
                }
                placeholder="O5985"
                maxLength={LANVAC_ACCOUNT_CODE_INPUT_MAX}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={adminInputClass}
              />
              <span className="text-xs text-white/40">
                Station CODE. O-5985 or 5985 both become O5985.
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Dispatch city {hasMonitoring ? "*" : ""}
              <LanvacCitySelect
                required={hasMonitoring}
                value={form.lanvacCity}
                onChange={(city) => setForm((f) => ({ ...f, lanvacCity: city }))}
              />
              <span className="text-xs text-white/40">
                Exact Lanvac spelling. Guessed from the service address when
                empty. Change it if the guess is wrong.
              </span>
            </label>
            <div className="sm:col-span-2 rounded-xl border border-white/10 bg-background p-4">
              <LanvacEmergencyReadout
                city={displayCity}
                numbers={lanvacEmergencyNumbers(displayCity)}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save station"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/40">Lanvac account number</dt>
                <dd className="mt-1 text-white/80">{client.lanvac_account_code ?? "Not on file"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/40">Dispatch city</dt>
                <dd className="mt-1 text-white/80">{client.lanvac_city ?? "Not on file"}</dd>
              </div>
            </dl>
            <div className="rounded-xl border border-white/10 bg-background p-4">
              <LanvacEmergencyReadout
                city={client.lanvac_city}
                numbers={lanvacEmergencyNumbers(client.lanvac_city)}
              />
            </div>
          </div>
        )}
      </div>
    </PortalCard>
  );
}

function ZonesSignalsCard({
  client,
  writesLive,
  stationState,
  stationZones,
  stationSignals,
}: {
  client: AdminClientDetailRow;
  writesLive: boolean;
  stationState: LanvacStationState | null;
  stationZones: LanvacStationZone[];
  stationSignals: LanvacStationSignal[];
}) {
  if (!hasCurrentMonitoring(client.services) || !client.lanvac_account_code) return null;

  return (
    <PortalCard
      icon="shield"
      tone="monitoring"
      title="Zones & Signals"
      description={`Zone list, on-test, and Historic Signals for Lanvac ${client.lanvac_account_code}${
        client.lanvac_city ? ` in ${client.lanvac_city}` : ""
      }.`}
    >
      <div className="border-t border-white/10 pt-5">
        <LanvacStationReadout
          profileId={client.id}
          canRefresh
          variant="admin"
          writesLive={writesLive}
          state={stationState}
          zones={stationZones}
          signals={stationSignals}
        />
      </div>
    </PortalCard>
  );
}

function CallerIdCard({
  client,
  contacts,
  changes,
}: {
  client: AdminClientDetailRow;
  contacts: CallerIdContact[];
  changes: Tables<"caller_id_changes">[];
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <PortalCard
      id="alarm-contact-list"
      icon="phone"
      tone="monitoring"
      title="Caller ID List"
      description="People the station should call, in order. Do not add police, fire, or ambulance here. Those come from the dispatch city on the Monitoring station card. Changes here are made on the client's behalf. You must record how they authorized it and why; the history below is permanent and the client is automatically emailed exactly what changed."
      action={
        <button type="button" onClick={() => setShowHistory((v) => !v)} className={buttonSecondary}>
          {showHistory ? "Hide History" : `History (${changes.length})`}
        </button>
      }
    >
      <div className="border-t border-white/10 pt-5">
        <CallerIdEditor
          key={contacts.map((c) => `${c.id}|${c.phone}|${c.label}|${c.passcode ?? ""}`).join(",")}
          variant="admin"
          profileId={client.id}
          initialContacts={contacts}
        />
      </div>

      {showHistory && (
        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            Change history (permanent record)
          </p>
          {changes.length === 0 && (
            <p className="text-sm text-white/40">No changes recorded yet.</p>
          )}
          {changes.map((change) => {
            const added = (change.added ?? []) as DiffEntry[];
            const removed = (change.removed ?? []) as DiffEntry[];
            const reordered = (change.reordered ?? []) as DiffEntry[];
            const isAdmin = change.changed_via === "admin_dashboard";
            return (
              <div key={change.id} className="rounded-xl border border-white/10 bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    {isAdmin ? "Admin change" : "Client change"}
                    <span className="font-normal text-white/50">
                      {" "}by {change.changed_by_email ?? "unknown"}
                    </span>
                  </p>
                  <p className="text-xs text-white/40">
                    {new Date(change.created_at).toLocaleString("en-CA")}
                  </p>
                </div>
                <div className="mt-2 space-y-0.5">
                  <HistoryDiffList entries={added} kind="added" />
                  <HistoryDiffList entries={removed} kind="removed" />
                  <HistoryDiffList entries={reordered} kind="moved" />
                </div>
                {isAdmin && (
                  <div className="mt-2 space-y-1 text-xs text-white/50">
                    <p>
                      Authorized via{" "}
                      <span className="text-white/80">
                        {AUTHORIZED_VIA_LABELS[change.authorized_via ?? ""] ?? change.authorized_via}
                      </span>
                      {" "}&middot; Reason: <span className="text-white/80">{change.change_reason}</span>
                    </p>
                    <p>
                      {change.client_notified_at
                        ? `Client notified ${new Date(change.client_notified_at).toLocaleString("en-CA")}`
                        : "Client notification email NOT confirmed. Follow up manually."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PortalCard>
  );
}

// ---------------------------------------------------------------------------
// Devices card: accounts start with no devices; admins add from the preset
// list so replacement reminders start on day one. Renames keep the alert
// guard; a new date or interval re-arms it (R14). Clients see the list
// read-only on their dashboard.
// ---------------------------------------------------------------------------

function DeviceRow({ device }: { device: Tables<"devices"> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(device.label);
  const [category, setCategory] = useState(device.category);
  const [installedOn, setInstalledOn] = useState(device.installed_on);
  const [years, setYears] = useState(String(device.lifetime_years));

  const expired = isDeviceExpired(device.installed_on, device.lifetime_years);
  const dueDate = deviceExpiryDate(device.installed_on, device.lifetime_years).toLocaleDateString(
    "en-CA",
    { year: "numeric", month: "long" },
  );
  const dirty =
    label !== device.label ||
    category !== device.category ||
    installedOn !== device.installed_on ||
    years !== String(device.lifetime_years);

  function save() {
    setNotice(null);
    const lifetimeYears = Number.parseInt(years, 10);
    if (!Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
      setNotice({ kind: "error", text: "Enter how many years until replacement." });
      return;
    }
    startTransition(async () => {
      const result = await updateDeviceAction({
        deviceId: device.id,
        label,
        category,
        installedOn,
        lifetimeYears,
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: "Device saved." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    const confirmed = window.confirm(
      `Stop tracking "${device.label}"?\n\nIt disappears from this account and the client's dashboard, and no more replacement reminders are sent for it.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteDeviceAction(device.id);
      if (!result.ok) setNotice({ kind: "error", text: result.error });
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        expired ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-background"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="font-bold text-white">{device.label}</p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
            {deviceCategoryLabel(device.category)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expired && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Replacement due
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="cursor-pointer rounded-lg border border-red-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-white/50">
        {expired ? `Replacement was due ${dueDate}.` : `Next replacement due ${dueDate}.`}
      </p>

      <div className="mt-3 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60 sm:min-w-[10rem] sm:flex-1">
            Device name
            <DeviceNameSelect
              value={label}
              onChange={(next, preset) => {
                setLabel(next);
                if (preset) {
                  setCategory(preset.category);
                  setYears(String(preset.years));
                }
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${adminSelectClass} max-w-full`}
            >
              {DEVICE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {DEVICE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Installed / last replaced
            <DatePickerInput
              value={installedOn}
              onChange={setInstalledOn}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Replace every (years)
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={`${adminInputClass} sm:w-24`}
            />
          </label>
          <button
            type="button"
            disabled={pending || !dirty || !label.trim() || !installedOn}
            onClick={save}
            className={buttonSecondary}
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevicesCard({
  client,
  devices,
}: {
  client: AdminClientDetailRow;
  devices: Tables<"devices">[];
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<DeviceCategory>("other");
  const [installedOn, setInstalledOn] = useState("");
  const [years, setYears] = useState("5");

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const lifetimeYears = Number.parseInt(years, 10);
    if (!Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
      setNotice({ kind: "error", text: "Enter how many years until replacement." });
      return;
    }
    startTransition(async () => {
      const result = await addDeviceAction({
        profileId: client.id,
        label,
        category,
        installedOn,
        lifetimeYears,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setLabel("");
      setCategory("other");
      setInstalledOn("");
      setYears("5");
      setNotice({ kind: "ok", text: "Device added. It now shows on the client's dashboard too." });
    });
  }

  return (
    <PortalCard
      id="equipment-maintenance"
      icon="wrench"
      tone="monitoring"
      title="Devices"
      description="Name devices however you need (hallway smoke 1, bedroom smoke). The Devices tab filters by category, not by name. A wireless smoke or CO detector is two rows: the detector unit, and its battery. When a device comes due, both the client and the McKee inbox are emailed."
    >
      <div className="space-y-3 border-t border-white/10 pt-5">
        <NoticeBanner notice={notice} />

        {devices.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No devices tracked yet. Add the equipment you want replacement
            reminders for.
          </p>
        )}
        {devices.map((device) => (
          <DeviceRow key={device.id} device={device} />
        ))}

        <form
          onSubmit={add}
          className="grid gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex sm:flex-wrap sm:items-end"
        >
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:min-w-[12rem] sm:flex-1">
            Add a device
            <DeviceNameSelect
              required
              value={label}
              onChange={(next, preset) => {
                setLabel(next);
                if (preset) {
                  setCategory(preset.category);
                  setYears(String(preset.years));
                }
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DeviceCategory)}
              className={`${adminSelectClass} max-w-full`}
            >
              {DEVICE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {DEVICE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Installed on
            <DatePickerInput
              required
              value={installedOn}
              onChange={setInstalledOn}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Replace every (years)
            <input
              type="number"
              required
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={`${adminInputClass} sm:w-24`}
            />
          </label>
          <button
            type="submit"
            disabled={pending || !label.trim() || !installedOn}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add Device"}
          </button>
        </form>
      </div>
    </PortalCard>
  );
}

export type AdminClientTab = "account" | "billing" | "security" | "devices";

export function AdminClientDetail({
  tab,
  client,
  siblingSiteCount,
  account,
  members,
  callerIdContacts,
  callerIdChanges,
  devices,
  manualPayments,
  cardPayments,
  cloudBackupInterest,
  writesLive,
  stationState,
  stationZones,
  stationSignals,
}: {
  tab: AdminClientTab;
  client: AdminClientDetailRow;
  siblingSiteCount: number;
  account: AdminAccountCardAccount | null;
  members: AdminAccountMember[];
  callerIdContacts: CallerIdContact[];
  callerIdChanges: Tables<"caller_id_changes">[];
  devices: Tables<"devices">[];
  manualPayments: Tables<"manual_payments">[];
  cardPayments: CardPaymentEntry[];
  cloudBackupInterest: Tables<"cloud_backup_interest"> | null;
  writesLive: boolean;
  stationState: LanvacStationState | null;
  stationZones: LanvacStationZone[];
  stationSignals: LanvacStationSignal[];
}) {
  const showCallerId =
    hasCurrentMonitoring(client.services) || callerIdContacts.length > 0 || callerIdChanges.length > 0;
  const showStation =
    hasCurrentMonitoring(client.services) ||
    Boolean(client.lanvac_account_code || client.lanvac_city) ||
    showCallerId;
  const showDevices = hasCurrentMonitoring(client.services) || devices.length > 0;

  if (tab === "billing") {
    return (
      <div className="space-y-8 sm:space-y-10">
        <header className="border-b border-white/10 pb-8 pt-4 sm:pb-10 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <PortalCardIcon icon="card" tone="billing" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                Services &amp; billing
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                Plans, payment rails, and history
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                Each assigned service keeps the same color and icon as the
                client portal: red for monitoring, teal for VoIP, sky for
                Camera Cloud Backup.
              </p>
            </div>
          </div>
        </header>
        <ServicesBillingCard
          client={client}
          manualPayments={manualPayments}
          cardPayments={cardPayments}
          cloudBackupInterest={cloudBackupInterest}
        />
      </div>
    );
  }

  if (tab === "security") {
    return (
      <div className="space-y-8 sm:space-y-10">
        <AdminSecurityHeader client={client} />
        {showStation && <MonitoringStationCard client={client} />}
        <ZonesSignalsCard
          client={client}
          writesLive={writesLive}
          stationState={stationState}
          stationZones={stationZones}
          stationSignals={stationSignals}
        />
        {showCallerId && (
          <CallerIdCard client={client} contacts={callerIdContacts} changes={callerIdChanges} />
        )}
        {!showStation && !showCallerId && (
          <p className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-white/50 sm:p-6">
            No monitoring station or alarm contact list on this account yet.
          </p>
        )}
      </div>
    );
  }

  if (tab === "devices") {
    return (
      <div className="space-y-8 sm:space-y-10">
        <header className="border-b border-white/10 pb-8 pt-4 sm:pb-10 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <PortalCardIcon icon="wrench" tone="monitoring" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                Equipment
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                Replacement tracking for this site
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
                These are the devices McKee tracks for service life. They are
                not the same as the station zone list.
              </p>
            </div>
          </div>
        </header>
        {showDevices ? (
          <DevicesCard client={client} devices={devices} />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-white/50 sm:p-6">
            No equipment is tracked on this account yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileCard client={client} />
      <InvitationCard client={client} siblingSiteCount={siblingSiteCount} />
      {account && <AdminAccountCard account={account} currentProfileId={client.id} />}
      <AdminAccountPeople members={members} />
      <DangerZone client={client} siblingSiteCount={siblingSiteCount} />
    </div>
  );
}
