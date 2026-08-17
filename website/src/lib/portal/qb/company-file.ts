import "server-only";

/**
 * Sandbox expected path (PORTAL_PLAN.md D17 / 4.2). The live file is only
 * written into `qb_bridges.expected_company_file` at 8C.
 */
export const PORTAL_TEST_COMPANY_FILE =
  "C:\\Users\\Public\\Documents\\Intuit\\QuickBooks\\PORTAL-TEST\\McKee Security PORTAL-TEST do-not-invoice.QBW";

export const LIVE_COMPANY_FILE =
  "C:\\Users\\Public\\Documents\\Intuit\\QuickBooks\\Company Files\\McKee Security Live.QBW";

/** Case, slash, quote, and trailing-separator insensitive compare. */
export function normalizeCompanyFile(path: string): string {
  return path
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim()
    .replace(/\//g, "\\")
    .replace(/\\+$/g, "")
    .toLowerCase();
}

export function companyFilesMatch(
  expected: string,
  reported: string | null | undefined,
): boolean | null {
  if (!reported?.trim()) return null;
  return normalizeCompanyFile(expected) === normalizeCompanyFile(reported);
}
