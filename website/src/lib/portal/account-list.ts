/** Staff Clients-list helpers. Link key is `account_id`, not the site email. */

export type SiteLinkFilter = "" | "linked" | "single";

export function siteCountByAccount(
  rows: Array<{ account_id: string | null }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.account_id) continue;
    counts.set(row.account_id, (counts.get(row.account_id) ?? 0) + 1);
  }
  return counts;
}

export function accountDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed || "Account";
}

/** Null when this site is the only one on its account. */
export function linkedAccountChip(accountName: string, siteCount: number): string | null {
  if (siteCount < 2) return null;
  return `${accountName} · ${siteCount} sites`;
}

export function accountNameFromEmbed(
  accounts: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!accounts) return accountDisplayName(null);
  if (Array.isArray(accounts)) return accountDisplayName(accounts[0]?.name);
  return accountDisplayName(accounts.name);
}

export type AccountListOption = {
  id: string;
  name: string;
  siteCount: number;
  emails: string[];
  codes: string[];
};

/** Unique accounts from the staff Clients list, for the Add-site picker. */
type AccountEmbed = {
  name: string;
  account_members?: Array<{ email: string } | null> | null;
};

function memberEmailsFromEmbed(
  accounts: AccountEmbed | AccountEmbed[] | null | undefined,
): string[] {
  if (!accounts) return [];
  const row = Array.isArray(accounts) ? accounts[0] : accounts;
  return (row?.account_members ?? [])
    .map((member) => member?.email?.trim())
    .filter((email): email is string => Boolean(email));
}

export function accountsFromClientRows(
  rows: Array<{
    account_id: string | null;
    email: string | null;
    lanvac_account_code: string | null;
    accounts: AccountEmbed | AccountEmbed[] | null;
  }>,
): AccountListOption[] {
  const map = new Map<string, AccountListOption>();
  for (const row of rows) {
    if (!row.account_id) continue;
    const extraEmails = memberEmailsFromEmbed(row.accounts);
    const existing = map.get(row.account_id);
    if (!existing) {
      const emails = row.email ? [row.email] : [];
      for (const email of extraEmails) {
        if (!emails.includes(email)) emails.push(email);
      }
      map.set(row.account_id, {
        id: row.account_id,
        name: accountNameFromEmbed(row.accounts),
        siteCount: 1,
        emails,
        codes: row.lanvac_account_code ? [row.lanvac_account_code] : [],
      });
      continue;
    }
    existing.siteCount += 1;
    if (row.email && !existing.emails.includes(row.email)) existing.emails.push(row.email);
    for (const email of extraEmails) {
      if (!existing.emails.includes(email)) existing.emails.push(email);
    }
    if (row.lanvac_account_code && !existing.codes.includes(row.lanvac_account_code)) {
      existing.codes.push(row.lanvac_account_code);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function accountMatchesQuery(account: AccountListOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    account.name.toLowerCase().includes(needle) ||
    account.emails.some((email) => email.toLowerCase().includes(needle)) ||
    account.codes.some((code) => code.toLowerCase().includes(needle))
  );
}
