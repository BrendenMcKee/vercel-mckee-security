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

export type EmailField = {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
};

export type FormEmailOptions = {
  kind: FormEmailKind;
  fields: EmailField[];
  serviceSlug?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFieldValue(field: EmailField): string {
  const safe = escapeHtml(field.value).replace(/\n/g, "<br />");
  if (field.href) {
    return `<a href="${escapeHtml(field.href)}" style="color:${BRAND_RED};text-decoration:none;font-weight:600;">${safe}</a>`;
  }
  return safe;
}

function renderFieldRow(field: EmailField): string {
  const highlightStyle = field.highlight
    ? `background:${BRAND_RED_SOFT};border-left:4px solid ${BRAND_RED};padding:16px 18px;border-radius:12px;border:1px solid rgba(201,24,24,0.22);`
    : `background:${FIELD};padding:14px 16px;border-radius:12px;border:1px solid ${BORDER};`;

  return `
    <tr>
      <td style="padding:0 0 12px;">
        <div style="${highlightStyle}">
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

export function buildFormEmailHtml({
  kind,
  fields,
  serviceSlug,
}: FormEmailOptions): string {
  const meta = getFormEmailMeta(kind, serviceSlug);
  const rows = fields.map(renderFieldRow).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(meta.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.45);">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg, ${BRAND_RED} 0%, #8f1010 100%);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:24px 24px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="56" valign="top" style="padding-right:14px;">
                      <div style="width:52px;height:52px;border-radius:14px;background:${BRAND_RED_SOFT};border:1px solid rgba(201,24,24,0.25);text-align:center;line-height:52px;font-size:26px;">
                        ${meta.emoji}
                      </div>
                    </td>
                    <td valign="top">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">
                        ${escapeHtml(siteConfig.name)}
                      </p>
                      <h1 style="margin:6px 0 0;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
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
              <td style="padding:4px 24px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 22px;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
                  Submitted via
                  <a href="${siteConfig.url}" style="color:${BRAND_RED};text-decoration:none;font-weight:600;">
                    ${siteConfig.url.replace("https://", "")}
                  </a>
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

export function buildFormEmailText({
  kind,
  fields,
  serviceSlug,
}: FormEmailOptions): string {
  const meta = getFormEmailMeta(kind, serviceSlug);
  const lines = [
    `${meta.emoji} ${siteConfig.name}`,
    meta.title,
    meta.inboxLabel,
    "—".repeat(36),
    "",
    ...fields.flatMap((field) => [field.label, field.value, ""]),
    `Submitted via ${siteConfig.url}`,
  ];

  return lines.join("\n").trim();
}

export const applySourceLabels: Record<string, string> = {
  search: "Search Engine",
  social: "Social Media",
  referral: "Referral",
  other: "Other",
};

// Re-export for API routes
export { buildFormEmailSubject } from "@/lib/form-email-meta";
