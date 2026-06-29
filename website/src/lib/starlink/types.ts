import type { Tables } from "./database.types";

export type Unit = Tables<"units">;
export type Rental = Tables<"rentals">;

export type RentalUnitSummary = Pick<Unit, "id" | "name" | "color" | "active">;
export type RentalWithUnit = Rental & { unit: RentalUnitSummary | null };

export const RENTAL_STATUSES = [
  "requested",
  "confirmed",
  "active",
  "returned",
  "cancelled",
] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

export const RENTAL_SOURCES = ["website", "admin"] as const;
export type RentalSource = (typeof RENTAL_SOURCES)[number];

/** Statuses that occupy a unit and therefore block availability. */
export const BLOCKING_STATUSES: readonly RentalStatus[] = ["confirmed", "active"];

export type StatusTone =
  | "amber"
  | "blue"
  | "green"
  | "slate"
  | "red";

export const STATUS_TONE_HEX: Record<StatusTone, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  green: "#22c55e",
  slate: "#64748b",
  red: "#ef4444",
};

export const STATUS_META: Record<
  RentalStatus,
  { label: string; tone: StatusTone; description: string }
> = {
  requested: {
    label: "Requested",
    tone: "amber",
    description: "New request from the website. Not locked in.",
  },
  confirmed: {
    label: "Confirmed",
    tone: "blue",
    description: "Dates locked and a unit assigned.",
  },
  active: {
    label: "Out",
    tone: "green",
    description: "Kit is currently with the customer.",
  },
  returned: {
    label: "Returned",
    tone: "slate",
    description: "Kit is back. Rental complete.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "red",
    description: "Request or booking was cancelled.",
  },
};

/** Distinct, brand-friendly palette suggested when creating new units. */
export const UNIT_COLOR_PALETTE = [
  "#c91818",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
] as const;
