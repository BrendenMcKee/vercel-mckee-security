import "server-only";
import { sendEmail } from "@/lib/email";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  type EmailField,
} from "@/lib/email-templates";
import { siteConfig } from "@/lib/site-config";
import { formatPhone } from "@/lib/portal/phone";
import { recordPortalAlert } from "@/lib/portal/alerts";

/**
 * All portal emails dispatch through here so a failed send is never just a
 * log line: it lands in the admin Alerts tab (handover 22.3) with enough
 * context to retry manually. Returns sendEmail's semantics (true only when
 * a message was actually dispatched).
 */
async function dispatchPortalEmail(
  label: string,
  payload: Parameters<typeof sendEmail>[0],
): Promise<boolean> {
  try {
    const sent = await sendEmail(payload);
    if (!sent) {
      await recordPortalAlert("email_failure", `${label}: not sent (email service not configured).`, {
        subject: payload.subject,
        to: payload.to ?? "admin inbox",
      });
    }
    return sent;
  } catch (error) {
    console.error(`[portal] ${label} failed:`, error);
    await recordPortalAlert("email_failure", `${label}: send failed.`, {
      subject: payload.subject,
      to: payload.to ?? "admin inbox",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const PORTAL_FOOTER_HTML = `Sent by McKee Security &nbsp;&bull;&nbsp;
  <a href="${siteConfig.url}" style="color:#c91818;text-decoration:none;font-weight:600;">${siteConfig.url.replace("https://", "")}</a>
  &nbsp;&bull;&nbsp; (705) 457-2156`;

const PORTAL_FOOTER_TEXT = [
  `Sent by McKee Security | ${siteConfig.url} | (705) 457-2156`,
];

function formatExpiry(expiresAt: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(expiresAt));
  } catch {
    return new Date(expiresAt).toUTCString();
  }
}

/**
 * Account invitation (PORTAL_PLAN.md Section 8, Phase 2). Returns false when
 * the email could not be dispatched; callers surface that to the admin so the
 * invite link can be delivered manually (a failed send never rolls back the
 * created client).
 */
export async function sendInvitationEmail({
  to,
  firstName,
  activateUrl,
  expiresAt,
}: {
  to: string;
  firstName: string;
  activateUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const meta = {
    emoji: "🔐",
    title: "Your Client Portal Invitation",
    inboxLabel: "McKee Security account activation",
  };

  const fields: EmailField[] = [
    {
      label: "Welcome",
      value: `Hi ${firstName},\n\nMcKee Security has created a client portal account for you. Use it to view your services, manage your alarm contact list, and keep your account details current.`,
    },
    {
      label: "Activate your account",
      value:
        "Click the button below to choose how you sign in: continue with Google or set a password.",
      href: activateUrl,
      cta: true,
      buttonLabel: "Activate My Account",
    },
    {
      label: "Link expires",
      value: `${formatExpiry(expiresAt)} ET. If it expires, contact McKee Security and we will send a fresh one.`,
    },
  ];

  return dispatchPortalEmail("Invitation email", {
    to,
    subject: "Activate your McKee Security client portal account",
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Caller ID change emails (PORTAL_PLAN.md Section 8, R23/R24)
// ---------------------------------------------------------------------------

export type CallerIdDiffEntry = { phone: string; label: string };

const DIFF_GREEN = "#22c55e";
const DIFF_GREEN_BG = "rgba(34, 197, 94, 0.12)";
const DIFF_RED = "#ef4444";
const DIFF_RED_BG = "rgba(239, 68, 68, 0.12)";

function diffRowHtml(entry: CallerIdDiffEntry, kind: "added" | "removed"): string {
  const color = kind === "added" ? DIFF_GREEN : DIFF_RED;
  const bg = kind === "added" ? DIFF_GREEN_BG : DIFF_RED_BG;
  const sign = kind === "added" ? "+" : "&minus;";
  return `<div style="background:${bg};border:1px solid ${color};border-radius:8px;padding:8px 12px;margin:0 0 6px;">
    <span style="color:${color};font-weight:700;">${sign}&nbsp;${escapeHtml(formatPhone(entry.phone))}</span>
    <span style="color:#f5f5f5;">&nbsp;&mdash;&nbsp;${escapeHtml(entry.label)}</span>
  </div>`;
}

function diffHtml(added: CallerIdDiffEntry[], removed: CallerIdDiffEntry[]): string {
  const rows = [
    ...added.map((e) => diffRowHtml(e, "added")),
    ...removed.map((e) => diffRowHtml(e, "removed")),
  ];
  return rows.join("") || "<em>No changes</em>";
}

function diffText(added: CallerIdDiffEntry[], removed: CallerIdDiffEntry[]): string {
  return [
    ...added.map((e) => `+ ${formatPhone(e.phone)} (${e.label})`),
    ...removed.map((e) => `- ${formatPhone(e.phone)} (${e.label})`),
  ].join("\n");
}

/**
 * Operational trigger for the Lanvac update (R23): fires on EVERY list change
 * from either side, to the admin inbox, with green/red diff rows and a
 * "changed by" line. Failures are logged and reported to the caller; a failed
 * send never rolls back the save.
 */
export async function sendCallerIdAdminAlert({
  clientName,
  clientEmail,
  changedByDescription,
  added,
  removed,
  authorizedVia,
  changeReason,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  changedByDescription: string;
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  authorizedVia?: string | null;
  changeReason?: string | null;
  profileId: string;
}): Promise<boolean> {
  const meta = {
    emoji: "📞",
    title: "Caller ID List Changed",
    inboxLabel: "Update Lanvac to match the new list",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Changed by", value: changedByDescription },
    {
      label: "Changes (green added, red removed)",
      value: diffText(added, removed),
      htmlValue: diffHtml(added, removed),
    },
  ];
  if (authorizedVia) {
    fields.push({ label: "Authorized via", value: AUTHORIZATION_LABELS[authorizedVia] ?? authorizedVia });
  }
  if (changeReason) {
    fields.push({ label: "Reason", value: changeReason });
  }
  fields.push({
    label: "Update the monitoring station",
    value: "Apply this exact diff to the Lanvac call list, then archive this email as the record.",
    href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
    cta: true,
    buttonLabel: "Open Client Detail",
  });

  return dispatchPortalEmail("Caller ID admin alert", {
    subject: `Caller ID change: ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

export const AUTHORIZATION_LABELS: Record<string, string> = {
  client_email: "Client emailed the request",
  client_verbal: "Client requested verbally (phone/site visit)",
  client_in_person: "Client requested in person",
  mckee_initiated: "McKee-initiated correction",
};

/**
 * R24 accountability email: the client is ALWAYS told when an admin changes
 * their list, with the exact diff, the recorded reason, and a dispute path.
 * The caller stamps client_notified_at on the history row when this returns
 * true.
 */
export async function sendCallerIdClientNotification({
  to,
  firstName,
  added,
  removed,
  authorizedVia,
  changeReason,
}: {
  to: string;
  firstName: string;
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  authorizedVia: string;
  changeReason: string;
}): Promise<boolean> {
  const meta = {
    emoji: "📞",
    title: "Your Alarm Contact List Was Updated",
    inboxLabel: "Change made by McKee Security on your behalf",
  };

  const fields: EmailField[] = [
    {
      label: "What happened",
      value: `Hi ${firstName},\n\nMcKee Security updated the caller ID contact list for your alarm monitoring, as requested.`,
    },
    {
      label: "Changes (green added, red removed)",
      value: diffText(added, removed),
      htmlValue: diffHtml(added, removed),
    },
    { label: "Authorization on file", value: AUTHORIZATION_LABELS[authorizedVia] ?? authorizedVia },
    { label: "Reason recorded", value: changeReason },
    {
      label: "Did not request this?",
      value:
        "If you did not ask for this change, contact McKee Security immediately at (705) 457-2156 or info@mckeesecurity.ca.",
      highlight: true,
    },
  ];

  return dispatchPortalEmail("Caller ID client notification", {
    to,
    subject: "Your McKee Security alarm contact list was updated",
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Billing emails (PORTAL_PLAN.md Section 8, R22; Phase 5)
// ---------------------------------------------------------------------------

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

const SERVICE_LABELS: Record<string, string> = {
  monitoring: "Security Monitoring",
  cloud_backup: "Camera Cloud Backup",
};

/** Manual-rail reminder (R22): sent by the daily cron before due and when overdue. */
export async function sendManualPaymentReminder({
  to,
  firstName,
  serviceType,
  amountCents,
  dueOn,
  overdue,
  paymentInstructions,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  amountCents: number;
  dueOn: string;
  overdue: boolean;
  paymentInstructions: string;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    emoji: "💳",
    title: overdue ? "Payment Overdue" : "Payment Reminder",
    inboxLabel: `${service} billing`,
  };

  const fields: EmailField[] = [
    {
      label: overdue ? "Overdue payment" : "Upcoming payment",
      value: `Hi ${firstName},\n\nYour ${service} payment of ${dollars(amountCents)} ${overdue ? "was due" : "is due"} on ${dueOn}.`,
      highlight: overdue,
    },
    { label: "How to pay", value: paymentInstructions },
    {
      label: "Already paid?",
      value: "If you have already sent this payment, no action is needed. It will be confirmed once processed.",
    },
  ];

  return dispatchPortalEmail("Manual payment reminder", {
    to,
    subject: overdue
      ? `Payment overdue: ${service} (${dollars(amountCents)})`
      : `Payment reminder: ${service} due ${dueOn}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Confirmation when an admin records a manual payment (7.3). */
export async function sendManualPaymentRecorded({
  to,
  firstName,
  serviceType,
  amountCents,
  paidOn,
  nextDueOn,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  amountCents: number;
  paidOn: string;
  nextDueOn: string | null;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    emoji: "✅",
    title: "Payment Received",
    inboxLabel: `${service} billing`,
  };

  const fields: EmailField[] = [
    {
      label: "Thank you",
      value: `Hi ${firstName},\n\nMcKee Security received your ${service} payment of ${dollars(amountCents)} on ${paidOn}.`,
    },
  ];
  if (nextDueOn) {
    fields.push({ label: "Next payment due", value: nextDueOn });
  }

  return dispatchPortalEmail("Manual payment recorded email", {
    to,
    subject: `Payment received: ${service} (${dollars(amountCents)})`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Admin alert for a failed card payment (Stripe invoice.payment_failed). */
export async function sendCardPaymentFailedAlert({
  clientName,
  clientEmail,
  serviceType,
  amountCents,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  serviceType: string | null;
  amountCents: number | null;
  profileId: string | null;
}): Promise<boolean> {
  const meta = {
    emoji: "⚠️",
    title: "Card Payment Failed",
    inboxLabel: "Stripe autopay needs follow-up",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Service", value: serviceType ? (SERVICE_LABELS[serviceType] ?? serviceType) : "Unknown" },
    { label: "Amount", value: amountCents != null ? dollars(amountCents) : "See Stripe dashboard" },
    {
      label: "Follow up",
      value: "Stripe will retry per its schedule. If retries keep failing, contact the client for an updated card.",
      href: profileId
        ? `${siteConfig.url}/admin-dashboard/clients/${profileId}`
        : `${siteConfig.url}/admin-dashboard?tab=billing`,
      cta: true,
      buttonLabel: "Open Billing",
    },
  ];

  return dispatchPortalEmail("Card payment failed alert", {
    subject: `Card payment failed: ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Client confirmation after checkout completes (handover 12, optional). */
export async function sendPaymentSuccessEmail({
  to,
  firstName,
  serviceType,
  tier,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  tier: string;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    emoji: "✅",
    title: "Payment Successful",
    inboxLabel: `${service} is active`,
  };

  const fields: EmailField[] = [
    {
      label: "You are all set",
      value: `Hi ${firstName},\n\nYour payment went through and your ${service} service (${tier} plan) is now active. Renewals are automatic; you will only hear from us if a payment ever fails.`,
    },
  ];

  return dispatchPortalEmail("Payment success email", {
    to,
    subject: `Payment successful: ${service} is active`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Cron emails (PORTAL_PLAN.md 9.4, Phase 7)
// ---------------------------------------------------------------------------

/** R14: one alert per expiry event, to the admin inbox, when the cron finds an expired device. */
export async function sendDeviceExpiryAdminAlert({
  clientName,
  clientEmail,
  deviceLabel,
  installedOn,
  expiredOn,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  deviceLabel: string;
  installedOn: string;
  expiredOn: string;
  profileId: string;
}): Promise<boolean> {
  const meta = {
    emoji: "🔋",
    title: "Device Past Its Service Life",
    inboxLabel: "Schedule a replacement",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Device", value: deviceLabel },
    { label: "Installed", value: installedOn },
    { label: "Service life ended", value: expiredOn },
    {
      label: "Next step",
      value: "Contact the client to schedule a replacement, then update the install date on their profile (that clears this alert cycle).",
      href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
      cta: true,
      buttonLabel: "Open Client Detail",
    },
  ];

  return dispatchPortalEmail("Device expiry admin alert", {
    subject: `Device replacement due: ${deviceLabel} — ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** R14: matching client notice (handover 6.5/11.9: both parties are told). */
export async function sendDeviceExpiryClientNotice({
  to,
  firstName,
  deviceLabel,
  installedOn,
}: {
  to: string;
  firstName: string;
  deviceLabel: string;
  installedOn: string;
}): Promise<boolean> {
  const meta = {
    emoji: "🔋",
    title: "Time to Replace a Device",
    inboxLabel: "McKee Security maintenance notice",
  };

  const fields: EmailField[] = [
    {
      label: "Maintenance due",
      value: `Hi ${firstName},\n\nThe ${deviceLabel} on your alarm system (installed ${installedOn}) has reached the end of its recommended service life and should be replaced to keep your protection reliable.`,
    },
    {
      label: "What to do",
      value: "McKee Security will reach out to schedule a replacement. You can also call (705) 457-2156 to book a time that works for you.",
    },
  ];

  return dispatchPortalEmail("Device expiry client notice", {
    to,
    subject: `Maintenance due: your ${deviceLabel} should be replaced`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

export type CollectionsDigestRow = {
  clientName: string;
  clientEmail: string | null;
  serviceType: string;
  amountCents: number | null;
  dueOn: string;
  overdue: boolean;
};

/**
 * R22: the admin collections digest — every manual payer due within the
 * reminder window or overdue, in one email, so no legacy payment is missed.
 * Sent by the daily cron only when the list is non-empty.
 */
export async function sendCollectionsDigest(rows: CollectionsDigestRow[]): Promise<boolean> {
  const overdueRows = rows.filter((r) => r.overdue);
  const dueRows = rows.filter((r) => !r.overdue);
  const line = (r: CollectionsDigestRow) =>
    `${r.clientName}${r.clientEmail ? ` (${r.clientEmail})` : ""} — ${SERVICE_LABELS[r.serviceType] ?? r.serviceType} — ${
      r.amountCents != null ? dollars(r.amountCents) : "amount not set"
    } — due ${r.dueOn}`;

  const meta = {
    emoji: "📋",
    title: "Collections Digest",
    inboxLabel: `${overdueRows.length} overdue, ${dueRows.length} due soon`,
  };

  const fields: EmailField[] = [];
  if (overdueRows.length > 0) {
    fields.push({
      label: `Overdue (${overdueRows.length})`,
      value: overdueRows.map(line).join("\n"),
      highlight: true,
    });
  }
  if (dueRows.length > 0) {
    fields.push({
      label: `Due soon (${dueRows.length})`,
      value: dueRows.map(line).join("\n"),
    });
  }
  fields.push({
    label: "Record received payments",
    value: "Open the Billing tab to record e-Transfers, cheques, and cash as they arrive.",
    href: `${siteConfig.url}/admin-dashboard?tab=billing`,
    cta: true,
    buttonLabel: "Open Billing",
  });

  return dispatchPortalEmail("Collections digest", {
    subject: `Collections digest: ${overdueRows.length} overdue, ${dueRows.length} due soon`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}
