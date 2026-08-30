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
  siteLabels: string[];
};

function siteLabelFromRow(row: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
}

/** Unique accounts from the staff Clients list, for the Add-site picker. */
export function accountsFromClientRows(
  rows: Array<{
    account_id: string | null;
    email: string | null;
    lanvac_account_code: string | null;
    first_name?: string | null;
    last_name?: string | null;
    accounts: { name: string } | { name: string }[] | null;
  }>,
): AccountListOption[] {
  const map = new Map<string, AccountListOption>();
  for (const row of rows) {
    if (!row.account_id) continue;
    const label = siteLabelFromRow(row);
    const existing = map.get(row.account_id);
    if (!existing) {
      map.set(row.account_id, {
        id: row.account_id,
        name: accountNameFromEmbed(row.accounts),
        siteCount: 1,
        emails: row.email ? [row.email] : [],
        codes: row.lanvac_account_code ? [row.lanvac_account_code] : [],
        siteLabels: label ? [label] : [],
      });
      continue;
    }
    existing.siteCount += 1;
    if (row.email && !existing.emails.includes(row.email)) existing.emails.push(row.email);
    if (row.lanvac_account_code && !existing.codes.includes(row.lanvac_account_code)) {
      existing.codes.push(row.lanvac_account_code);
    }
    if (label && !existing.siteLabels.includes(label)) existing.siteLabels.push(label);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Site count plus CODEs, or site names when a site has no monitoring CODE. */
export function accountPickerDetail(account: AccountListOption): string {
  const count = account.siteCount === 1 ? "1 site" : `${account.siteCount} sites`;
  const tags: string[] = [];
  for (const code of account.codes) {
    if (!tags.includes(code)) tags.push(code);
  }
  if (account.codes.length < account.siteCount) {
    for (const label of account.siteLabels) {
      if (!tags.includes(label)) tags.push(label);
    }
  }
  if (tags.length === 0) return count;
  return `${count} · ${tags.slice(0, 4).join(", ")}`;
}

/** Member emails come from a separate query so the Clients list does not nest them. */
export function mergeMemberEmails(
  accounts: AccountListOption[],
  members: Array<{ account_id: string; email: string }>,
): AccountListOption[] {
  if (members.length === 0) return accounts;
  const extras = new Map<string, string[]>();
  for (const member of members) {
    const email = member.email.trim();
    if (!email) continue;
    const list = extras.get(member.account_id) ?? [];
    if (!list.includes(email)) list.push(email);
    extras.set(member.account_id, list);
  }
  return accounts.map((account) => {
    const more = extras.get(account.id);
    if (!more?.length) return account;
    const emails = [...account.emails];
    for (const email of more) {
      if (!emails.includes(email)) emails.push(email);
    }
    return { ...account, emails };
  });
}

export function accountMatchesQuery(account: AccountListOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    account.name.toLowerCase().includes(needle) ||
    account.emails.some((email) => email.toLowerCase().includes(needle)) ||
    account.codes.some((code) => code.toLowerCase().includes(needle)) ||
    account.siteLabels.some((label) => label.toLowerCase().includes(needle))
  );
}
