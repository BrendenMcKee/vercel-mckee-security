"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronRight,
  Search,
  CalendarDays,
  ArrowDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TenantConfig } from "@/lib/data-drops/config";
import type { Drop, RunDay, Site } from "@/lib/data-drops/types";
import {
  DataDropsApiError,
  deleteDay,
  getAllDrops,
  getDates,
} from "@/lib/data-drops/api";
import {
  anyToYmd,
  longToYmd,
  signedStatus,
  todayYmd,
  ymdToLong,
} from "@/lib/data-drops/dates";
import {
  DEVICE_PRESETS,
  deviceColor,
  normalizeDevice,
} from "@/lib/data-drops/devices";
import { Modal } from "./ui/modal";
import { useToast } from "./ui/toast";
import { Field, FormError, inputClass } from "./ui/field";
import { LoadingState, EmptyState, ErrorState } from "./ui/states";
import { StatusDot, StatusPill } from "./ui/status";
import { DeviceBadge } from "./ui/device-badge";
import { NetworkRunDetails } from "./run-details";

type SortField = "date" | "signed";
type SortDirection = "asc" | "desc";

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumbers(value: string): string {
  const matches = value.match(/\d+/g);
  return matches ? matches.join("") : "";
}

function extractLetterPrefix(value: string): string {
  const match = value.match(/^[a-zA-Z]+/);
  return match ? match[0].toLowerCase() : "";
}

function sortDays(
  data: RunDay[],
  field: SortField,
  direction: SortDirection,
): RunDay[] {
  return [...data].sort((a, b) => {
    if (field === "date") {
      const da = longToYmd(a.date);
      const db = longToYmd(b.date);
      return direction === "desc" ? db.localeCompare(da) : da.localeCompare(db);
    }
    if (a.signed !== b.signed) return a.signed - b.signed;
    return longToYmd(b.date).localeCompare(longToYmd(a.date));
  });
}

export function SiteOverview({
  tenant,
  site,
  targetDate,
  onBack,
}: {
  tenant: TenantConfig;
  site: Site;
  targetDate: string | null;
  onBack: () => void;
}) {
  const toast = useToast();
  const domain = tenant.domain;
  const siteName = site.site_name;

  const [runDays, setRunDays] = useState<RunDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [allDrops, setAllDrops] = useState<Drop[]>([]);
  const [searchType, setSearchType] = useState<
    "label" | "description" | "device"
  >("label");
  const [searchRange, setSearchRange] = useState({ start: "", end: "" });
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<Drop[]>([]);
  const [deviceQuery, setDeviceQuery] = useState("");
  const [deviceSort, setDeviceSort] = useState<"device" | "newest" | "oldest">(
    "device",
  );
  // The device currently being searched, kept so its chip stays highlighted
  // while you view its results.
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);

  const [showDetails, setShowDetails] = useState(Boolean(targetDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(targetDate);
  const [isAddingNewDay, setIsAddingNewDay] = useState(false);
  // Label of the run to focus/highlight when opening a day from a device result.
  const [focusLabel, setFocusLabel] = useState<string | null>(null);

  const [dayToDelete, setDayToDelete] = useState<RunDay | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const fetchRunDays = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDates(siteName, domain);
      const entries = data.success && Array.isArray(data.dateData) ? data.dateData : [];
      const mapped: RunDay[] = entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        signed: signedStatus(entry.signature_tech, entry.signature_admin),
        drops: entry.total_drops || 0,
      }));
      setRunDays(mapped);
      setError(null);
    } catch {
      setError("Failed to load network runs. Please try again later.");
      setRunDays([]);
    } finally {
      setIsLoading(false);
    }
  }, [siteName, domain]);

  const sortedDays = useMemo(
    () => sortDays(runDays, sortField, sortDirection),
    [runDays, sortField, sortDirection],
  );

  // Distinct custom devices present in this site's data (not already presets),
  // surfaced as one-click search buttons alongside the presets.
  const extraDevices = useMemo(() => {
    const presetNorm = new Set(DEVICE_PRESETS.map((d) => normalizeDevice(d)));
    const seen = new Set<string>();
    const found: string[] = [];
    for (const drop of allDrops) {
      const raw = drop.data_device;
      if (!raw) continue;
      const norm = normalizeDevice(raw);
      if (presetNorm.has(norm) || seen.has(norm)) continue;
      seen.add(norm);
      found.push(raw);
    }
    return found.sort((a, b) => a.localeCompare(b));
  }, [allDrops]);

  const displayedResults = useMemo(() => {
    if (searchType !== "device") return searchResults;
    const byDate = (a: Drop, b: Drop, dir: "asc" | "desc") => {
      const da = anyToYmd(a.date) || "";
      const db = anyToYmd(b.date) || "";
      return dir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    };
    const sorted = [...searchResults];
    if (deviceSort === "device") {
      sorted.sort((a, b) => {
        const cmp = normalizeDevice(a.data_device).localeCompare(
          normalizeDevice(b.data_device),
        );
        return cmp !== 0 ? cmp : byDate(a, b, "desc");
      });
    } else {
      sorted.sort((a, b) =>
        byDate(a, b, deviceSort === "oldest" ? "asc" : "desc"),
      );
    }
    return sorted;
  }, [searchResults, searchType, deviceSort]);

  const fetchAllDrops = useCallback(async () => {
    try {
      const data = await getAllDrops(siteName, domain);
      setAllDrops(data.success && Array.isArray(data.dropsData) ? data.dropsData : []);
    } catch {
      setAllDrops([]);
    }
  }, [siteName, domain]);

  useEffect(() => {
    // Data-fetch effect: loads this site's days and drops from the API and
    // manages its own loading/result state (intended sync with external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRunDays();
    fetchAllDrops();
  }, [fetchRunDays, fetchAllDrops]);

  function applySort(field: SortField) {
    let direction: SortDirection = "desc";
    if (field === sortField && field === "date") {
      direction = sortDirection === "asc" ? "desc" : "asc";
    } else if (field === "signed") {
      direction = "asc";
    }
    setSortField(field);
    setSortDirection(direction);
  }

  function openDay(day: RunDay) {
    setFocusLabel(null);
    setSelectedDate(longToYmd(day.date));
    setIsAddingNewDay(false);
    setShowDetails(true);
  }

  function addNewDay() {
    setFocusLabel(null);
    setSelectedDate(todayYmd());
    setIsAddingNewDay(true);
    setShowDetails(true);
  }

  function handleBackFromDetails(shouldRefresh?: boolean, newDate?: string | null) {
    if (newDate === null) {
      setShowDetails(false);
      setSelectedDate(null);
      setIsAddingNewDay(false);
      fetchRunDays();
      fetchAllDrops();
      return;
    }
    if (newDate) {
      // Navigating to a specific date opens it as an existing day, not a new one.
      setFocusLabel(null);
      setSelectedDate(newDate);
      setIsAddingNewDay(false);
      setShowDetails(true);
    } else {
      setShowDetails(false);
      setSelectedDate(null);
      setIsAddingNewDay(false);
    }
    if (shouldRefresh) {
      fetchRunDays();
      fetchAllDrops();
    }
  }

  function runLabelSearch() {
    const startLabel = normalizeText(searchRange.start.trim());
    const endLabelRaw = searchRange.end.trim();
    if (!searchRange.start.trim()) {
      toast({ type: "info", message: "Please enter at least a start label." });
      return;
    }
    const endLabel = endLabelRaw ? normalizeText(endLabelRaw) : "";
    const startNumbers = extractNumbers(searchRange.start);
    const endNumbers = endLabelRaw ? extractNumbers(endLabelRaw) : "";
    const startPrefix = extractLetterPrefix(searchRange.start);

    let results: Drop[];
    if (endLabel) {
      results = allDrops.filter((drop) => {
        const label = drop.data_label || "";
        const dropNumbers = extractNumbers(label);
        const dropPrefix = extractLetterPrefix(label);
        if (dropNumbers && startNumbers && endNumbers) {
          const dropNum = parseInt(dropNumbers, 10);
          const startNum = parseInt(startNumbers, 10);
          const endNum = parseInt(endNumbers, 10);
          const inRange =
            !Number.isNaN(dropNum) &&
            !Number.isNaN(startNum) &&
            !Number.isNaN(endNum) &&
            dropNum >= startNum &&
            dropNum <= endNum;
          if (startPrefix) return inRange && dropPrefix === startPrefix;
          return inRange;
        }
        const normalized = normalizeText(label);
        return normalized >= startLabel && normalized <= endLabel;
      });
      results.sort((a, b) => {
        const prefixA = extractLetterPrefix(a.data_label || "");
        const prefixB = extractLetterPrefix(b.data_label || "");
        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
        const numA = parseInt(extractNumbers(a.data_label || ""), 10) || 0;
        const numB = parseInt(extractNumbers(b.data_label || ""), 10) || 0;
        return numA - numB;
      });
    } else {
      results = allDrops.filter((drop) => {
        const label = drop.data_label || "";
        const dropNumbers = extractNumbers(label);
        const dropPrefix = extractLetterPrefix(label);
        if (dropNumbers && startNumbers) {
          if (startPrefix) {
            return dropPrefix === startPrefix && dropNumbers.includes(startNumbers);
          }
          return dropNumbers.includes(startNumbers);
        }
        return normalizeText(label).includes(startLabel);
      });
      results.sort((a, b) =>
        normalizeText(a.data_label || "").localeCompare(
          normalizeText(b.data_label || ""),
        ),
      );
    }

    setSearchResults(results);
    setIsSearchMode(true);
    scrollToResults();
  }

  function runDescriptionSearch() {
    const query = descriptionSearch.trim();
    if (!query) {
      toast({ type: "info", message: "Please enter a description to search for." });
      return;
    }
    const keywords = normalizeText(query)
      .split(" ")
      .filter((word) => word.length > 0);

    const results = allDrops
      .map((drop) => {
        const combined = `${drop.data_location || ""} ${drop.data_description || ""}`;
        const normalized = normalizeText(combined);
        const relevance = keywords.reduce(
          (count, keyword) => (normalized.includes(keyword) ? count + 1 : count),
          0,
        );
        return { drop, relevance };
      })
      .filter((item) => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .map((item) => item.drop);

    setSearchResults(results);
    setIsSearchMode(true);
    scrollToResults();
  }

  function searchByDevice(term: string, exact: boolean) {
    const normalized = normalizeDevice(term);
    if (!normalized) {
      toast({ type: "info", message: "Pick or type a device to search for." });
      return;
    }
    const results = allDrops.filter((drop) => {
      const device = normalizeDevice(drop.data_device);
      if (!device) return false;
      return exact ? device === normalized : device.includes(normalized);
    });
    setActiveDevice(term);
    setSearchResults(results);
    setIsSearchMode(true);
    scrollToResults();
  }

  function scrollToResults() {
    // Scroll to the search panel (not the results list) so the distance scrolled
    // is the same no matter how many results there are, and the device chips
    // stay in view. scroll-margin-top keeps it clear of the fixed site header.
    setTimeout(() => {
      searchSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (searchType === "label") runLabelSearch();
    else if (searchType === "device") searchByDevice(deviceQuery, false);
    else runDescriptionSearch();
  }

  function exitSearch() {
    setIsSearchMode(false);
    setSearchRange({ start: "", end: "" });
    setDescriptionSearch("");
    setDeviceQuery("");
    setActiveDevice(null);
  }

  function openSearchResult(drop: Drop) {
    const ymd = anyToYmd(drop.date);
    if (!ymd) return;
    setFocusLabel(drop.data_label);
    setSelectedDate(ymd);
    setIsAddingNewDay(false);
    setShowDetails(true);
  }

  async function handleDeleteDay() {
    if (!dayToDelete) return;
    if (!deletePassword.trim()) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleting(true);
    try {
      await deleteDay({
        site_name: siteName,
        date: dayToDelete.date,
        admin_password: deletePassword,
        site_domain: domain,
      });
      setDayToDelete(null);
      setDeletePassword("");
      setDeleteError("");
      toast({ type: "success", message: "All runs for that date were deleted." });
      fetchRunDays();
      fetchAllDrops();
    } catch (err) {
      if (err instanceof DataDropsApiError && err.status === 401) {
        setDeleteError("Invalid administrative password.");
      } else {
        setDeleteError(
          err instanceof DataDropsApiError
            ? err.message
            : "Failed to delete. Please try again.",
        );
      }
    } finally {
      setDeleting(false);
    }
  }

  if (showDetails && selectedDate) {
    return (
      <NetworkRunDetails
        tenant={tenant}
        siteName={siteName}
        date={selectedDate}
        isNewDay={isAddingNewDay}
        focusLabel={focusLabel}
        onBack={handleBackFromDetails}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        All sites
      </button>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {tenant.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          {siteName}
        </h1>
      </header>

      {/* Search */}
      <div
        ref={searchSectionRef}
        className="mb-6 scroll-mt-28 rounded-2xl border border-white/10 bg-surface p-4 sm:p-5 lg:scroll-mt-40"
      >
        <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
          {(["label", "description", "device"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSearchType(type);
                // Switching search mode discards prior results so the device
                // sorter never operates on label/description matches.
                exitSearch();
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                searchType === type
                  ? "bg-primary text-white"
                  : "text-white/50 hover:text-white",
              )}
            >
              {type === "label"
                ? "By Label"
                : type === "description"
                  ? "By Description"
                  : "By Device"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          {searchType === "label" ? (
            <>
              <p className="text-xs text-white/50">
                Enter a single label, or a start and end label to search a range.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Start label"
                  value={searchRange.start}
                  onChange={(event) =>
                    setSearchRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                />
                <span className="hidden text-white/30 sm:block">to</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="End label (optional)"
                  value={searchRange.end}
                  onChange={(event) =>
                    setSearchRange((prev) => ({ ...prev, end: event.target.value }))
                  }
                />
              </div>
            </>
          ) : searchType === "device" ? (
            <>
              <p className="text-xs text-white/50">
                Pick a device, or type a custom one, to find all matching drops.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...DEVICE_PRESETS, ...extraDevices].map((d) => {
                  const color = deviceColor(d);
                  const isActive =
                    normalizeDevice(d) === normalizeDevice(activeDevice);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => searchByDevice(d, true)}
                      aria-pressed={isActive}
                      className="rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
                      style={{
                        color,
                        borderColor: isActive ? color : `${color}55`,
                        backgroundColor: `${color}${isActive ? "40" : "1f"}`,
                        boxShadow: isActive ? `0 0 0 1.5px ${color}` : undefined,
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                className={inputClass}
                placeholder="Custom device..."
                value={deviceQuery}
                maxLength={120}
                onChange={(event) => setDeviceQuery(event.target.value)}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-white/50">
                Search across locations and descriptions by keyword.
              </p>
              <input
                type="text"
                className={inputClass}
                placeholder="Enter description keywords..."
                value={descriptionSearch}
                onChange={(event) => setDescriptionSearch(event.target.value)}
              />
            </>
          )}
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" onClick={addNewDay}>
          <Plus className="h-4 w-4" />
          Add New Day
        </Button>
        {!isSearchMode && runDays.length > 0 ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 text-white/40">
              <ArrowDownUp className="h-3.5 w-3.5" />
              Sort
            </span>
            <button
              type="button"
              onClick={() => applySort("date")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-semibold transition-colors",
                sortField === "date"
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white",
              )}
            >
              Date {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              onClick={() => applySort("signed")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-semibold transition-colors",
                sortField === "signed"
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white",
              )}
            >
              Signed
            </button>
          </div>
        ) : null}
      </div>

      {/* Body */}
      {isSearchMode ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Search Results</h3>
              <p className="text-xs text-white/50">
                {searchResults.length}{" "}
                {searchResults.length === 1 ? "drop" : "drops"} found
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={exitSearch}>
              <ArrowLeft className="h-4 w-4" />
              Back to dates
            </Button>
          </div>
          {searchType === "device" && searchResults.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="flex items-center gap-1 text-white/40">
                <ArrowDownUp className="h-3.5 w-3.5" />
                Sort
              </span>
              {(
                [
                  ["device", "Device A-Z"],
                  ["newest", "Newest"],
                  ["oldest", "Oldest"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDeviceSort(key)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 font-semibold transition-colors",
                    deviceSort === key
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {searchResults.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching drops"
              description="No drops matched your search criteria."
            />
          ) : (
            <ul className="space-y-2">
              {displayedResults.map((drop) => {
                const ymd = anyToYmd(drop.date);
                return (
                  <li key={drop.id}>
                    <button
                      type="button"
                      onClick={() => openSearchResult(drop)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 text-left transition-colors hover:border-white/25"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">
                          {drop.data_label}
                        </span>
                        <span className="block truncate text-xs text-white/40">
                          {drop.data_location}
                        </span>
                      </span>
                      {drop.data_device ? (
                        <DeviceBadge
                          device={drop.data_device}
                          className="shrink-0"
                        />
                      ) : null}
                      <span className="shrink-0 text-xs text-white/40">
                        {ymd ? ymdToLong(ymd) : drop.date}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : isLoading ? (
        <LoadingState label="Loading network runs" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRunDays} />
      ) : runDays.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No network runs yet"
          description='Click "Add New Day" to record your first set of runs for this site.'
          action={
            <Button size="sm" onClick={addNewDay}>
              <Plus className="h-4 w-4" />
              Add New Day
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {sortedDays.map((day) => (
            <motion.li
              key={day.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 transition-colors hover:border-white/25"
            >
              <button
                type="button"
                onClick={() => openDay(day)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <StatusDot status={day.signed} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">
                    {day.date}
                  </span>
                  <span className="block text-xs text-white/40">
                    {day.drops} {day.drops === 1 ? "drop" : "drops"}
                  </span>
                </span>
              </button>
              <div className="hidden sm:block">
                <StatusPill status={day.signed} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDayToDelete(day);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                title="Delete all runs for this date"
                aria-label={`Delete runs for ${day.date}`}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-white/20" />
            </motion.li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(dayToDelete)}
        onClose={() => setDayToDelete(null)}
        title={dayToDelete ? `Delete runs for ${dayToDelete.date}` : "Delete runs"}
      >
        {dayToDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              This permanently deletes all network runs for this date. This action
              cannot be undone.
            </p>
            <Field
              label="Administrative Password"
              htmlFor="dd-delete-day-pw"
              hint="If you have forgotten the password, contact web@mckeesecurity.ca"
            >
              <input
                id="dd-delete-day-pw"
                type="password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteError("");
                }}
                className={inputClass}
                placeholder="Enter administrative password"
              />
            </Field>
            <FormError>{deleteError}</FormError>
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleDeleteDay}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? "Deleting..." : "Delete all runs"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDayToDelete(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
