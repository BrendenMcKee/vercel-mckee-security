"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  acceptGroupingSuggestionAction,
  rejectGroupingSuggestionAction,
  signOffGroupingAction,
} from "@/lib/portal/actions/grouping";
import {
  groupingKindLabel,
  type GroupingBoardSite,
  type GroupingBoardSuggestion,
} from "@/lib/portal/grouping";
import { adminInputClass } from "@/components/admin-portal/ui";
import { PortalHelpSection, PortalHelpTip } from "@/components/portal/portal-help-tip";

function siteLabel(site: GroupingBoardSite): string {
  const name = `${site.firstName} ${site.lastName}`.trim();
  const bits = [site.code, site.city, site.email].filter(Boolean);
  return bits.length > 0 ? `${name} (${bits.join(" · ")})` : name;
}

function GroupingSuggestionCard({
  suggestion,
}: {
  suggestion: GroupingBoardSuggestion;
}) {
  const [name, setName] = useState(suggestion.suggestedName);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(suggestion.sites.map((site) => [site.id, true])),
  );
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  }

  function accept() {
    const selected = suggestion.sites.filter((site) => checked[site.id]);
    if (selected.length < 2) {
      setNotice({ kind: "error", text: "Leave at least two sites checked, or reject this suggestion." });
      return;
    }
    const list = selected.map(siteLabel).join("\n");
    const ok = window.confirm(
      `Link these sites onto one account named ${name.trim()}?\n\n${list}\n\nThis does not send email. Leftover site invitations expire.`,
    );
    if (!ok) return;
    setNotice(null);
    startTransition(async () => {
      const result = await acceptGroupingSuggestionAction({
        suggestionId: suggestion.id,
        accountName: name,
        profileIds: selected.map((site) => site.id),
      });
      if (!result.ok) setNotice({ kind: "error", text: result.error });
    });
  }

  function reject() {
    const ok = window.confirm(
      "Reject this suggestion? It will not come back. You can still add a site by hand later.",
    );
    if (!ok) return;
    setNotice(null);
    startTransition(async () => {
      const result = await rejectGroupingSuggestionAction({ suggestionId: suggestion.id });
      if (!result.ok) setNotice({ kind: "error", text: result.error });
    });
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          {groupingKindLabel(suggestion.kind)}
        </p>
        <p className="text-xs text-white/45">{suggestion.sites.length} sites</p>
      </div>
      <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-white/55">
        Account name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${adminInputClass} mt-1.5 w-full`}
        />
      </label>
      <fieldset className="mt-4 space-y-2">
        <legend className="text-xs font-bold uppercase tracking-wide text-white/55">Sites</legend>
        {suggestion.sites.map((site) => (
          <div
            key={site.id}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={checked[site.id] ?? false}
                onChange={() => toggle(site.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="min-w-0">
                <span className="block font-bold text-white">
                  {site.firstName} {site.lastName}
                </span>
                <span className="mt-0.5 block text-sm text-white/60">
                  {[site.code ?? "No CODE", site.city, site.email].filter(Boolean).join(" · ")}
                </span>
              </span>
            </label>
            <Link
              href={`/admin-dashboard/clients/${site.id}`}
              className="shrink-0 pt-0.5 text-xs font-bold text-sky-300 hover:text-sky-200"
            >
              Open site
            </Link>
          </div>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={accept}
          className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Saving..." : "Accept"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={reject}
          className="cursor-pointer rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice.kind === "error" ? "text-red-200" : "text-emerald-200"}`}>
          {notice.text}
        </p>
      )}
    </article>
  );
}

export function AdminGroupingBoard({
  open,
  civic,
  signedOffAt,
}: {
  open: GroupingBoardSuggestion[];
  civic: GroupingBoardSite[];
  signedOffAt: string | null;
}) {
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = open.length === 0;

  function signOff() {
    if (!empty) return;
    const ok = window.confirm(
      "Sign off grouping? This records that a person walked the queue. GO LIVE still needs the rest of the checklist.",
    );
    if (!ok) return;
    setNotice(null);
    startTransition(async () => {
      const result = await signOffGroupingAction();
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setNotice({ kind: "ok", text: "Grouping is signed off." });
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Possible linked accounts</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
          Suggestions are a helper. Nothing is linked until you Accept. Uncheck a site to leave it
          out. Reject keeps the same set from coming back. This step does not send email.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-4 sm:p-6 ${
          signedOffAt && empty
            ? "border-emerald-500/30 bg-emerald-500/10"
            : empty
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-white/10 bg-surface"
        }`}
      >
        <p className="text-sm font-bold uppercase tracking-widest text-white/70">Grouping</p>
        {empty ? (
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            The list is empty. Sites that already share an account, like McKee House and
            Bunkie, do not show here. You can still sign off.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {open.length === 1 ? "1 open suggestion." : `${open.length} open suggestions.`} Accept or
            reject each one before sign-off.
          </p>
        )}
        {signedOffAt && (
          <p className="mt-2 text-xs text-white/55">
            Last signed off {new Date(signedOffAt).toLocaleString("en-CA")}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!empty || pending}
            onClick={signOff}
            className="cursor-pointer rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-amber-300 disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Saving..." : "Sign off grouping"}
          </button>
          <PortalHelpTip label="More info about grouping sign-off" title="Sign off grouping">
            <PortalHelpSection title="Why this button exists">
              <p>
                This portal can email real customers. Before customer email is turned on, a
                person at McKee has to look at the list of "these two sites might be the same
                customer." Sign off is that person's "I looked" stamp. It is a safety check, not
                a merge.
              </p>
            </PortalHelpSection>
            <PortalHelpSection title="What you are looking for">
              <p>
                Two alarm systems that belong to one customer (a house and a bunkie, or two
                township buildings) should share one login later. Two different customers who
                happen to have similar names should stay apart.
              </p>
            </PortalHelpSection>
            <PortalHelpSection title="What this button does">
              <ul className="list-disc space-y-1.5 pl-5">
                <li>It records that you reviewed this list.</li>
                <li>Customer email on the Billing tab cannot be turned on until someone has signed off.</li>
                <li>If a new maybe-match shows up later, the stamp clears and you look again.</li>
              </ul>
            </PortalHelpSection>
            <PortalHelpSection title="What this button does not do">
              <ul className="list-disc space-y-1.5 pl-5">
                <li>It does not put two sites on one account. That is the Accept button on a card.</li>
                <li>It does not send any email.</li>
                <li>It does not change anyone's login.</li>
              </ul>
            </PortalHelpSection>
            <PortalHelpSection title="When the list is empty">
              <p>
                That is OK. Sites that already share an account, like McKee House and Bunkie,
                do not show here. You can still sign off an empty list.
              </p>
            </PortalHelpSection>
          </PortalHelpTip>
        </div>
        {notice && (
          <p role="status" className={`mt-3 text-sm ${notice.kind === "error" ? "text-red-200" : "text-emerald-200"}`}>
            {notice.text}
          </p>
        )}
      </div>

      {open.length > 0 && (
        <div className="grid gap-4">
          {open.map((suggestion) => (
            <GroupingSuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}

      {civic.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
          <h3 className="text-lg font-bold text-white">Civic names to review</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            These names look municipal. Do not merge every civic site into one account. Same full
            name already appears above when it is a real match.
          </p>
          <ul className="mt-4 space-y-2">
            {civic.map((site) => (
              <li key={site.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <Link
                  href={`/admin-dashboard/clients/${site.id}`}
                  className="font-bold text-white hover:text-sky-200"
                >
                  {site.firstName} {site.lastName}
                </Link>
                <p className="mt-0.5 text-sm text-white/60">
                  {[site.code ?? "No CODE", site.city, site.email].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
