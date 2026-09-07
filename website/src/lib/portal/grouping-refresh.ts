import "server-only";

import {
  civicWatchlist,
  groupingCandidates,
  preferredGroupingAccountName,
  type GroupingBoardSite,
  type GroupingBoardSuggestion,
  type GroupingKind,
  type GroupingSiteInput,
} from "@/lib/portal/grouping";
import type { createPortalServerClient } from "@/lib/portal/supabase/server";

type PortalClient = Awaited<ReturnType<typeof createPortalServerClient>>;

export type { GroupingBoardSite, GroupingBoardSuggestion };

export type GroupingBoardData = {
  open: GroupingBoardSuggestion[];
  civic: GroupingBoardSite[];
  signedOffAt: string | null;
};

function asKind(value: string): GroupingKind | null {
  if (value === "same_name" || value === "same_email" || value === "qb_parent") return value;
  return null;
}

function toBoardSite(site: GroupingSiteInput): GroupingBoardSite {
  return {
    id: site.id,
    firstName: site.first_name,
    lastName: site.last_name,
    code: site.lanvac_account_code,
    city: site.lanvac_city,
    email: site.email,
  };
}

function actionableOpenCount(
  rows: Array<{ account_group_suggestion_sites?: Array<{ profile_id: string }> | null }>,
): number {
  return rows.filter((row) => (row.account_group_suggestion_sites ?? []).length >= 2).length;
}

/**
 * Open suggestions that still have two or more sites. Orphan rows (deleted
 * sites, failed site insert) do not block the badge, sign-off, or GO LIVE.
 */
export async function countOpenGroupingSuggestions(supabase: PortalClient): Promise<number> {
  const { data, error } = await supabase
    .from("account_group_suggestions")
    .select("id, account_group_suggestion_sites(profile_id)")
    .eq("status", "open");
  if (error) {
    console.error("[portal] grouping open count failed:", error);
    return 0;
  }
  return actionableOpenCount(data ?? []);
}

/**
 * Recompute grouping suggestions from live sites. New fingerprints become
 * open rows and clear sign-off. Rejected fingerprints stay dismissed.
 * Open rows whose sites now share an account become resolved.
 */
export async function refreshGroupingBoard(supabase: PortalClient): Promise<GroupingBoardData> {
  const [sitesRes, qbRes, existingRes, settingsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, account_id, first_name, last_name, email, lanvac_account_code, lanvac_city")
      .eq("role", "client"),
    supabase.from("qb_customers").select("profile_id, parent_list_id").not("parent_list_id", "is", null),
    supabase.from("account_group_suggestions").select("id, kind, status, fingerprint, suggested_name"),
    supabase.from("portal_settings").select("org_grouping_reviewed_at").eq("id", 1).maybeSingle(),
  ]);

  if (sitesRes.error) {
    console.error("[portal] grouping sites load failed:", sitesRes.error);
    throw new Error("Grouping failed to load.");
  }
  if (qbRes.error) {
    console.error("[portal] grouping qb load failed:", qbRes.error);
  }
  if (existingRes.error) {
    console.error("[portal] grouping suggestions load failed:", existingRes.error);
    throw new Error("Grouping failed to load.");
  }

  const sites = (sitesRes.data ?? []) as GroupingSiteInput[];
  const byId = new Map(sites.map((site) => [site.id, site]));
  const accountSiteCounts = new Map<string, number>();
  for (const site of sites) {
    if (!site.account_id) continue;
    accountSiteCounts.set(site.account_id, (accountSiteCounts.get(site.account_id) ?? 0) + 1);
  }

  const accountIds = [...accountSiteCounts.keys()];
  const { data: accountRows, error: accountError } = accountIds.length
    ? await supabase.from("accounts").select("id, name").in("id", accountIds)
    : { data: [] as Array<{ id: string; name: string }>, error: null };
  if (accountError) {
    console.error("[portal] grouping accounts load failed:", accountError);
  }
  const accountNames = new Map((accountRows ?? []).map((row) => [row.id, row.name]));

  const candidates = groupingCandidates(
    sites,
    (qbRes.data ?? []).map((row) => ({
      profile_id: row.profile_id ?? "",
      parent_list_id: row.parent_list_id,
    })),
  ).map((candidate) => {
    const group = candidate.profileIds
      .map((id) => byId.get(id))
      .filter((site): site is GroupingSiteInput => Boolean(site));
    const preferred = preferredGroupingAccountName(group, accountSiteCounts, accountNames);
    return preferred ? { ...candidate, suggestedName: preferred } : candidate;
  });

  const existing = existingRes.data ?? [];
  const byFingerprint = new Map(existing.map((row) => [row.fingerprint, row]));
  const candidateFingerprints = new Set(candidates.map((row) => row.fingerprint));

  const toInsert = candidates.filter((candidate) => !byFingerprint.has(candidate.fingerprint));
  const toReopen = candidates.filter((candidate) => byFingerprint.get(candidate.fingerprint)?.status === "resolved");
  const toResolve = existing.filter((row) => row.status === "open" && !candidateFingerprints.has(row.fingerprint));
  const toRename = candidates.filter((candidate) => {
    const row = byFingerprint.get(candidate.fingerprint);
    return row?.status === "open" && row.suggested_name !== candidate.suggestedName;
  });

  let insertedOpen = false;
  const nowIso = new Date().toISOString();

  if (toInsert.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from("account_group_suggestions")
      .insert(
        toInsert.map((candidate) => ({
          kind: candidate.kind,
          status: "open" as const,
          suggested_name: candidate.suggestedName,
          fingerprint: candidate.fingerprint,
        })),
      )
      .select("id, fingerprint");
    if (insertError) {
      if (insertError.code !== "23505") {
        console.error("[portal] grouping suggestion insert failed:", insertError);
      }
    } else if (created && created.length > 0) {
      const byCreatedFp = new Map(created.map((row) => [row.fingerprint, row.id]));
      const siteRows = toInsert.flatMap((candidate) => {
        const suggestionId = byCreatedFp.get(candidate.fingerprint);
        if (!suggestionId) return [];
        return candidate.profileIds.map((profileId) => ({
          suggestion_id: suggestionId,
          profile_id: profileId,
        }));
      });
      if (siteRows.length > 0) {
        const { error: siteError } = await supabase.from("account_group_suggestion_sites").insert(siteRows);
        if (siteError) {
          console.error("[portal] grouping suggestion sites insert failed:", siteError);
          const failedIds = created.map((row) => row.id);
          await supabase.from("account_group_suggestions").delete().in("id", failedIds);
        } else {
          insertedOpen = true;
        }
      }
    }
  }

  if (toReopen.length > 0) {
    const ids = toReopen
      .map((candidate) => byFingerprint.get(candidate.fingerprint)?.id)
      .filter((id): id is string => Boolean(id));
    const { error: reopenError } = await supabase
      .from("account_group_suggestions")
      .update({ status: "open", reviewed_at: null, reviewed_by: null })
      .in("id", ids);
    if (reopenError) {
      console.error("[portal] grouping suggestion reopen failed:", reopenError);
    } else {
      const siteRows = toReopen.flatMap((candidate) => {
        const suggestionId = byFingerprint.get(candidate.fingerprint)?.id;
        if (!suggestionId) return [];
        return candidate.profileIds.map((profileId) => ({
          suggestion_id: suggestionId,
          profile_id: profileId,
        }));
      });
      if (siteRows.length > 0) {
        const { error: siteError } = await supabase.from("account_group_suggestion_sites").insert(siteRows);
        if (siteError && siteError.code !== "23505") {
          console.error("[portal] grouping reopen sites failed:", siteError);
        }
      }
      insertedOpen = true;
    }
  }

  if (toResolve.length > 0) {
    const { error: resolveError } = await supabase
      .from("account_group_suggestions")
      .update({ status: "resolved", reviewed_at: nowIso })
      .in("id", toResolve.map((row) => row.id));
    if (resolveError) {
      console.error("[portal] grouping suggestion resolve failed:", resolveError);
    }
  }

  if (toRename.length > 0) {
    await Promise.all(
      toRename.map((candidate) => {
        const row = byFingerprint.get(candidate.fingerprint);
        if (!row) return Promise.resolve();
        return supabase
          .from("account_group_suggestions")
          .update({ suggested_name: candidate.suggestedName })
          .eq("id", row.id)
          .then(({ error }) => {
            if (error) console.error("[portal] grouping suggestion rename failed:", error);
          });
      }),
    );
  }

  if (insertedOpen) {
    const { error: clearError } = await supabase
      .from("portal_settings")
      .update({ org_grouping_reviewed_at: null })
      .eq("id", 1);
    if (clearError) {
      console.error("[portal] grouping sign-off clear failed:", clearError);
    }
  }

  const { data: openRows, error: openError } = await supabase
    .from("account_group_suggestions")
    .select("id, kind, suggested_name, account_group_suggestion_sites(profile_id)")
    .eq("status", "open")
    .order("suggested_name");
  if (openError) {
    console.error("[portal] grouping open reload failed:", openError);
    throw new Error("Grouping failed to load.");
  }

  const open: GroupingBoardSuggestion[] = [];
  const orphanIds: string[] = [];
  for (const row of openRows ?? []) {
    const kind = asKind(row.kind);
    if (!kind) continue;
    const listed = row.account_group_suggestion_sites ?? [];
    const boardSites = listed
      .map((link) => byId.get(link.profile_id))
      .filter((site): site is GroupingSiteInput => Boolean(site))
      .map(toBoardSite);
    if (boardSites.length < 2) {
      orphanIds.push(row.id);
      continue;
    }
    open.push({
      id: row.id,
      kind,
      suggestedName: row.suggested_name,
      sites: boardSites,
    });
  }

  if (orphanIds.length > 0) {
    const { error: orphanError } = await supabase
      .from("account_group_suggestions")
      .update({ status: "resolved", reviewed_at: nowIso })
      .in("id", orphanIds);
    if (orphanError) {
      console.error("[portal] grouping orphan resolve failed:", orphanError);
    }
  }

  const { data: settings } = insertedOpen
    ? await supabase.from("portal_settings").select("org_grouping_reviewed_at").eq("id", 1).maybeSingle()
    : settingsRes;

  return {
    open,
    civic: civicWatchlist(sites).map(toBoardSite),
    signedOffAt: settings?.org_grouping_reviewed_at ?? null,
  };
}
