import { siteConfig } from "@/lib/site-config";
import {
  type FormEmailKind,
  getFormEmailMeta,
} from "@/lib/form-email-meta";

const BRAND_RED = "#c91818";
const BRAND_RED_SOFT = "rgba(201, 24, 24, 0.14)";
const BG = "#070707";
const CARD = "#111111";
const FIELD = "#181818";
const TEXT = "#f5f5f5";
const MUTED = "rgba(255, 255, 255, 0.55)";
const BORDER = "rgba(255, 255, 255, 0.1)";

// Green action accent: deliberately different from the red brand/customer-info
// styling so the admin call-to-action is unmistakable.
const ACTION_GREEN = "#16a34a";
const ACTION_GREEN_DARK = "#15803d";
const ACTION_SOFT = "rgba(22, 163, 74, 0.12)";
const ACTION_BORDER = "rgba(22, 163, 74, 0.34)";
const BRAND_MARK_URL = `${siteConfig.url}/images/favicon-192.png`;

export type EmailField = {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
  /** Render as a prominent action button instead of a standard field row. */
  cta?: boolean;
  /** Text shown inside the CTA button (defaults to "Open admin portal"). */
  buttonLabel?: string;
  /**
   * Pre-rendered TRUSTED html for the value (e.g. the caller ID green/red
   * diff). Bypasses escaping; the plaintext fallback still uses `value`.
   * Never pass user input here without escaping it first.
   */
  htmlValue?: string;
};

export type FormEmailOptions = {
  kind: FormEmailKind;
  fields: EmailField[];
  serviceSlug?: string | null;
};

const TIMEZONE = "America/Toronto";

function torontoStamp(opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, ...opts }).format(
      new Date(),
    );
  } catch {
    return new Date().toUTCString();
  }
}

/** Compact stamp for subject lines, e.g. "Jun 29, 7:57 PM". */
function subjectStamp(): string {
  return torontoStamp({
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Fuller stamp for the email body, e.g. "Jun 29, 2026, 7:57 PM ET". */
function receivedStamp(): string {
  return `${torontoStamp({
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} ET`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFieldValue(field: EmailField): string {
  if (field.htmlValue) return field.htmlValue;
  const safe = escapeHtml(field.value).replace(/\n/g, "<br />");
  if (field.href) {
    return `<a href="${escapeHtml(field.href)}" style="color:${TEXT};text-decoration:underline;text-decoration-color:rgba(255,255,255,0.35);">${safe}</a>`;
  }
  return safe;
}

function renderFieldRow(field: EmailField): string {
  // Note ordering: the border shorthand must come before border-left, or it
  // resets the red accent bar on highlighted rows.
  const highlightStyle = field.highlight
    ? `background:${BRAND_RED_SOFT};border:1px solid rgba(201,24,24,0.22);border-left:4px solid ${BRAND_RED};padding:16px 18px;border-radius:12px;`
    : `background:${FIELD};padding:14px 16px;border-radius:12px;border:1px solid ${BORDER};`;

  return `
    <tr>
      <td style="padding:0 0 12px;">
        <div class="ee-box" style="${highlightStyle}">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_RED};">
            ${escapeHtml(field.label)}
          </p>
          <p style="margin:0;font-size:15px;line-height:1.65;color:${TEXT};">
            ${renderFieldValue(field)}
          </p>
        </div>
      </td>
    </tr>`;
}

// Bulletproof, table-based action button in a green-tinted panel so it stands
// out from the red customer-info rows. The td bgcolor is the Outlook fallback;
// the gradient/border-radius enhance clients that support them.
function renderCtaRow(field: EmailField): string {
  const href = escapeHtml(field.href ?? "#");
  const buttonLabel = escapeHtml(field.buttonLabel ?? "Open admin portal");

  return `
    <tr>
      <td style="padding:0 0 18px;">
        <div class="ee-cta" style="background:${ACTION_SOFT};border:1px solid ${ACTION_BORDER};border-radius:14px;padding:18px 18px 20px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACTION_GREEN};">
            ${escapeHtml(field.label)}
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${TEXT};">
            ${escapeHtml(field.value).replace(/\n/g, "<br />")}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
            <tr>
              <td align="center" bgcolor="${ACTION_GREEN}" style="border-radius:10px;background-image:linear-gradient(135deg, ${ACTION_GREEN} 0%, ${ACTION_GREEN_DARK} 100%);">
                <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
                  ${buttonLabel}
                </a>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>`;
}

export type BrandedEmailMeta = {
  emoji: string;
  title: string;
  inboxLabel: string;
};

/**
 * Generic branded shell shared by admin form notifications and portal emails
 * (PORTAL_PLAN.md Section 8). `footerHtml` defaults to the form-submission
 * footer; portal emails pass their own.
 */
export function buildBrandedEmailHtml(
  meta: BrandedEmailMeta,
  fields: EmailField[],
  footerHtml?: string,
): string {
  const rows = fields
    .map((field) => (field.cta ? renderCtaRow(field) : renderFieldRow(field)))
    .join("");
  const footer =
    footerHtml ??
    `Submitted via
                  <a href="${siteConfig.url}" style="color:${BRAND_RED};text-decoration:none;font-weight:600;">
                    ${siteConfig.url.replace("https://", "")}
                  </a>
                  &nbsp;&bull;&nbsp; Received ${escapeHtml(receivedStamp())}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(meta.title)}</title>
    <style>
      /* Mobile: give the content the horizontal room the desktop chrome eats.
         Clients that strip <style> (rare) just keep the desktop layout. */
      @media only screen and (max-width: 520px) {
        .ee-outer { padding: 12px 5px !important; }
        .ee-pad-head { padding: 18px 14px 12px !important; }
        .ee-pad-body { padding: 4px 14px 6px !important; }
        .ee-pad-foot { padding: 8px 14px 16px !important; }
        .ee-icon-cell { width: 44px !important; padding-right: 10px !important; }
        .ee-icon { width: 40px !important; height: 40px !important; }
        .ee-title { font-size: 20px !important; }
        .ee-box { padding: 12px !important; }
        .ee-cta { padding: 14px 12px 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
      <tr>
        <td align="center" class="ee-outer" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.45);">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg, ${BRAND_RED} 0%, #8f1010 100%);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="ee-pad-head" style="padding:24px 24px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="56" valign="top" class="ee-icon-cell" style="padding-right:14px;">
                      <img
                        class="ee-icon"
                        src="${escapeHtml(BRAND_MARK_URL)}"
                        width="48"
                        height="48"
                        alt=""
                        style="display:block;width:48px;height:48px;object-fit:contain;border:0;"
                      />
                    </td>
                    <td valign="top">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">
                        ${escapeHtml(siteConfig.name)}
                      </p>
                      <h1 class="ee-title" style="margin:6px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
                        ${escapeHtml(meta.title)}
                      </h1>
                      <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">
                        ${escapeHtml(meta.inboxLabel)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="ee-pad-body" style="padding:4px 24px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td class="ee-pad-foot" style="padding:8px 24px 22px;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
                  ${footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildBrandedEmailText(
  meta: BrandedEmailMeta,
  fields: EmailField[],
  footerLines?: string[],
): string {
  const lines = [
    `${meta.emoji} ${siteConfig.name}`,
    meta.title,
    meta.inboxLabel,
    "-".repeat(36),
    "",
    ...fields.flatMap((field) => {
      const block = [field.label, field.value];
      // Keep the actual link in plaintext for CTA buttons whose value is copy.
      if (field.cta && field.href) block.push(field.href);
      return [...block, ""];
    }),
    ...(footerLines ?? [`Submitted via ${siteConfig.url}`, `Received ${receivedStamp()}`]),
  ];

  return lines.join("\n").trim();
}

export function buildFormEmailHtml({
  kind,
  fields,
  serviceSlug,
}: FormEmailOptions): string {
  return buildBrandedEmailHtml(getFormEmailMeta(kind, serviceSlug), fields);
}

export function buildFormEmailText({
  kind,
  fields,
  serviceSlug,
}: FormEmailOptions): string {
  return buildBrandedEmailText(getFormEmailMeta(kind, serviceSlug), fields);
}

export const applySourceLabels: Record<string, string> = {
  search: "Search Engine",
  social: "Social Media",
  referral: "Referral",
  other: "Other",
};

// Re-export for API routes
export { buildFormEmailSubject } from "@/lib/form-email-meta";
