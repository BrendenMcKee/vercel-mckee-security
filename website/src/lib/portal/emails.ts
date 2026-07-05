import "server-only";
import { sendEmail } from "@/lib/email";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  type EmailField,
} from "@/lib/email-templates";
import { siteConfig } from "@/lib/site-config";

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

  try {
    return await sendEmail({
      to,
      subject: "Activate your McKee Security client portal account",
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Invitation email failed:", error);
    return false;
  }
}
