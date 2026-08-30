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
