/** Staff grouping-board heuristics. Suggestions are a review queue, never an auto-merge. */

export const GROUPING_KINDS = ["same_name", "same_email", "qb_parent"] as const;
export type GroupingKind = (typeof GROUPING_KINDS)[number];

export type GroupingSiteInput = {
  id: string;
  account_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  lanvac_account_code: string | null;
  lanvac_city: string | null;
};

export type GroupingCandidate = {
  kind: GroupingKind;
  suggestedName: string;
  fingerprint: string;
  profileIds: string[];
};

export type GroupingBoardSite = {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
  city: string | null;
  email: string | null;
};

export type GroupingBoardSuggestion = {
  id: string;
  kind: GroupingKind;
  suggestedName: string;
  sites: GroupingBoardSite[];
};

const NAME_BLOCKLIST = new Set([
  "new customer",
  "unknown",
  "test",
  "tbd",
  "none",
  "n/a",
]);

const CIVIC_RE =
  /\b(county|municipal|municipality|library|township|public works|fire hall|fire dept|town of|village of|registry)\b/i;

export function siteDisplayName(site: {
  first_name: string;
  last_name: string;
}): string {
  return `${site.first_name} ${site.last_name}`.trim().replace(/\s+/g, " ");
}

export function normalizeGroupingName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function groupingFingerprint(kind: GroupingKind, profileIds: string[]): string {
  return `${kind}:${[...profileIds].sort().join(",")}`;
}

export function looksCivicName(name: string): boolean {
  return CIVIC_RE.test(name);
}

/** Prefer an existing multi-site account name so Accept does not rename County / McKee. */
export function preferredGroupingAccountName(
  group: Array<{ account_id: string | null }>,
  accountSiteCounts: Map<string, number>,
  accountNames: Map<string, string>,
): string | null {
  const multi = [
    ...new Set(group.map((site) => site.account_id).filter((id): id is string => Boolean(id))),
  ].filter((id) => (accountSiteCounts.get(id) ?? 0) >= 2);
  if (multi.length !== 1) return null;
  const name = accountNames.get(multi[0]!)?.trim();
  return name || null;
}

function alreadyTogether(sites: GroupingSiteInput[]): boolean {
  const ids = new Set(sites.map((site) => site.account_id).filter(Boolean));
  return ids.size === 1 && sites.every((site) => site.account_id);
}

function groupBy(sites: GroupingSiteInput[], keyOf: (site: GroupingSiteInput) => string | null) {
  const map = new Map<string, GroupingSiteInput[]>();
  for (const site of sites) {
    const key = keyOf(site);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(site);
    map.set(key, list);
  }
  return map;
}

export function groupingCandidates(
  sites: GroupingSiteInput[],
  qbParents: Array<{ profile_id: string; parent_list_id: string | null }>,
): GroupingCandidate[] {
  const out: GroupingCandidate[] = [];
  const seen = new Set<string>();

  function push(kind: GroupingKind, suggestedName: string, group: GroupingSiteInput[]) {
    if (group.length < 2 || alreadyTogether(group)) return;
    const profileIds = group.map((site) => site.id);
    const fingerprint = groupingFingerprint(kind, profileIds);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    out.push({ kind, suggestedName, fingerprint, profileIds });
  }

  for (const [, group] of groupBy(sites, (site) => {
    const name = normalizeGroupingName(siteDisplayName(site));
    if (!name || NAME_BLOCKLIST.has(name)) return null;
    return name;
  })) {
    push("same_name", siteDisplayName(group[0]!), group);
  }

  for (const [email, group] of groupBy(sites, (site) => {
    const email = site.email?.trim().toLowerCase() ?? "";
    return email || null;
  })) {
    push("same_email", siteDisplayName(group[0]!) || email, group);
  }

  const byParent = new Map<string, GroupingSiteInput[]>();
  const byId = new Map(sites.map((site) => [site.id, site]));
  for (const row of qbParents) {
    const parent = row.parent_list_id?.trim();
    const site = byId.get(row.profile_id);
    if (!parent || !site) continue;
    const list = byParent.get(parent) ?? [];
    list.push(site);
    byParent.set(parent, list);
  }
  for (const [parent, group] of byParent) {
    const unique = [...new Map(group.map((site) => [site.id, site])).values()];
    push("qb_parent", siteDisplayName(unique[0]!) || `QuickBooks job ${parent}`, unique);
  }

  return out.sort((a, b) => a.suggestedName.localeCompare(b.suggestedName));
}

export function civicWatchlist(sites: GroupingSiteInput[]): GroupingSiteInput[] {
  return sites
    .filter((site) => looksCivicName(siteDisplayName(site)))
    .sort((a, b) => siteDisplayName(a).localeCompare(siteDisplayName(b)));
}

export function groupingKindLabel(kind: GroupingKind): string {
  switch (kind) {
    case "same_name":
      return "Same name";
    case "same_email":
      return "Same email";
    case "qb_parent":
      return "QuickBooks job";
  }
}
