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

export type DraftGroupingHint = {
  kind: "same_name" | "same_email" | "same_name_email" | "civic";
  accountId: string | null;
  accountName: string;
  siteCount: number;
  sampleLabel: string;
};

export function draftGroupingHintCopy(hint: DraftGroupingHint): string {
  if (hint.kind === "civic") {
    return "This looks like a town or municipal site. Use the building name (Dysart / Library). After you save, check Grouping. Do not put every library or county building on one account.";
  }
  const count = hint.siteCount > 1 ? ` (${hint.siteCount} sites)` : "";
  if (hint.kind === "same_name_email") {
    return `Same name and email as ${hint.sampleLabel} on ${hint.accountName}${count}. Add site now, or Accept on Grouping after you save.`;
  }
  if (hint.kind === "same_email") {
    return `Same email as ${hint.sampleLabel} on ${hint.accountName}${count}. Use Add site if it belongs there.`;
  }
  return `Same name as ${hint.sampleLabel} on ${hint.accountName}${count}. Add site now, or Accept on Grouping after you save.`;
}

/**
 * Live hint while staff type a New client or Add site form. Does not attach.
 * Same-name / same-email point at an existing account. Civic is review-only.
 * Caps account matches at three so a reused shop email cannot flood the form.
 */
export function draftGroupingHints(
  draft: { firstName: string; lastName: string; email: string },
  sites: Array<
    GroupingSiteInput & {
      account_name?: string | null;
    }
  >,
  accountSiteCounts: Map<string, number>,
  opts?: { ignoreAccountId?: string },
): DraftGroupingHint[] {
  const draftName = normalizeGroupingName(`${draft.firstName} ${draft.lastName}`);
  const draftEmail = draft.email.trim().toLowerCase();
  const ignore = opts?.ignoreAccountId ?? "";
  const civic = looksCivicName(`${draft.firstName} ${draft.lastName}`);
  if (!draftName && !draftEmail && !civic) return [];

  const byAccount = new Map<string, DraftGroupingHint>();

  function remember(hint: DraftGroupingHint) {
    const key = hint.accountId ?? `none:${hint.sampleLabel}`;
    const existing = byAccount.get(key);
    if (!existing) {
      byAccount.set(key, hint);
      return;
    }
    if (existing.kind !== hint.kind) {
      byAccount.set(key, { ...existing, kind: "same_name_email" });
    }
  }

  for (const site of sites) {
    if (site.account_id && site.account_id === ignore) continue;
    const accountName = site.account_name?.trim() || siteDisplayName(site);
    const siteCount = site.account_id ? (accountSiteCounts.get(site.account_id) ?? 1) : 1;
    const sample = [siteDisplayName(site), site.lanvac_account_code].filter(Boolean).join(" · ");

    if (draftName && NAME_BLOCKLIST.has(draftName) === false) {
      if (normalizeGroupingName(siteDisplayName(site)) === draftName) {
        remember({
          kind: "same_name",
          accountId: site.account_id,
          accountName,
          siteCount,
          sampleLabel: sample,
        });
      }
    }
    if (draftEmail && site.email?.trim().toLowerCase() === draftEmail) {
      remember({
        kind: "same_email",
        accountId: site.account_id,
        accountName,
        siteCount,
        sampleLabel: sample,
      });
    }
  }

  const accountHints = [...byAccount.values()].sort((a, b) => {
    if (b.siteCount !== a.siteCount) return b.siteCount - a.siteCount;
    return a.accountName.localeCompare(b.accountName);
  });
  const hints = accountHints.slice(0, 3);
  if (civic) {
    hints.push({
      kind: "civic",
      accountId: null,
      accountName: "",
      siteCount: 0,
      sampleLabel: "",
    });
  }
  return hints;
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
