"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  Loader2,
  LogOut,
  Plus,
  Satellite,
  Settings2,
} from "lucide-react";
import type { RentalWithUnit, Unit, UnitCost } from "@/lib/starlink/types";
import { fetchOverview } from "@/lib/starlink/client-api";
import { todayIsoToronto } from "@/lib/starlink/dates";
import {
  buildOutstandingGroups,
  outstandingBookingCount,
} from "@/lib/starlink/outstanding";
import { cn } from "@/lib/utils";
import { StarlinkStatsBar } from "./stats-bar";
import { ScheduleView } from "./schedule-view";
import { RentalsTable } from "./rentals-table";
import { FleetManager } from "./fleet-manager";
import { ProfitView } from "./profit-view";
import { AlertsView } from "./alerts-view";
import { RentalModal } from "./rental-modal";
import { Toast, type ToastState } from "./toast";

type View = "schedule" | "rentals" | "fleet" | "profit" | "alerts";

const TABS: { id: View; label: string; icon: typeof CalendarDays }[] = [
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "rentals", label: "Rentals", icon: ListChecks },
  { id: "fleet", label: "Fleet", icon: Settings2 },
  { id: "profit", label: "Profit", icon: CircleDollarSign },
  { id: "alerts", label: "Alerts", icon: Bell },
];

export function StarlinkAdminApp() {
  const router = useRouter();
  const todayIso = todayIsoToronto();

  const [units, setUnits] = useState<Unit[]>([]);
  const [rentals, setRentals] = useState<RentalWithUnit[]>([]);
  const [costs, setCosts] = useState<UnitCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("schedule");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRental, setModalRental] = useState<RentalWithUnit | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const deepLinkHandled = useRef(false);

  const alertGroups = useMemo(
    () => buildOutstandingGroups(rentals, todayIso),
    [rentals, todayIso],
  );
  const alertCount = outstandingBookingCount(alertGroups);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOverview();
      setUnits(data.units);
      setRentals(data.rentals);
      setCosts(data.costs);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Deep link from the inquiry email: /starlink-admin?rental=<id> opens that
  // request straight away once data has loaded.
  useEffect(() => {
    if (loading || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("rental");
    if (id) {
      const match = rentals.find((r) => r.id === id);
      if (match) {
        setModalRental(match);
        setModalOpen(true);
      }
    }
    deepLinkHandled.current = true;
  }, [loading, rentals]);

  const openNew = () => {
    setModalRental(null);
    setModalOpen(true);
  };
  const openRental = (rental: RentalWithUnit) => {
    setModalRental(rental);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleSaved = async (message: string) => {
    setModalOpen(false);
    setToast({ message, tone: "success" });
    await refresh();
  };
  const handleSuccess = (message: string) => setToast({ message, tone: "success" });
  const handleError = (message: string) => setToast({ message, tone: "error" });

  async function logout() {
    try {
      await fetch("/api/starlink-admin/unlock", { method: "DELETE" });
    } catch {
      // ignore
    }
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Satellite className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">
              Starlink Rentals
            </h1>
            <p className="text-xs text-white/55">McKee Security internal portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNew}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)] sm:min-h-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New rental</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 sm:min-h-0 sm:min-w-0"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading rentals...
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              refresh();
            }}
            className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <StarlinkStatsBar rentals={rentals} todayIso={todayIso} />
          </div>

          <nav className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-surface/40 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-2 text-[11px] font-semibold transition-colors sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm",
                    active
                      ? "bg-primary text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5">
                    {tab.label}
                    {tab.id === "alerts" ? (
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                          alertCount > 0
                            ? "bg-red-500 text-white"
                            : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40",
                        )}
                        aria-label={`${alertCount} open alerts`}
                      >
                        {alertCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </nav>

          {view === "schedule" ? (
            <ScheduleView
              rentals={rentals}
              units={units}
              todayIso={todayIso}
              onSelectRental={openRental}
            />
          ) : null}
          {view === "rentals" ? (
            <RentalsTable
              rentals={rentals}
              units={units}
              onSelectRental={openRental}
            />
          ) : null}
          {view === "fleet" ? (
            <FleetManager
              units={units}
              onChanged={refresh}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          ) : null}
          {view === "profit" ? (
            <ProfitView
              units={units}
              rentals={rentals}
              costs={costs}
              todayIso={todayIso}
              onChanged={refresh}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          ) : null}
          {view === "alerts" ? (
            <AlertsView groups={alertGroups} onSelectRental={openRental} />
          ) : null}
        </>
      )}

      {modalOpen ? (
        <RentalModal
          // Form state is seeded from the booking on mount, so a different
          // booking has to be a different instance.
          key={modalRental?.id ?? "new"}
          rental={modalRental}
          units={units}
          rentals={rentals}
          onClose={closeModal}
          onSaved={handleSaved}
          onError={handleError}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
