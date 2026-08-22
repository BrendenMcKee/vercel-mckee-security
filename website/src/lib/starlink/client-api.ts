import type {
  AdSpendRate,
  RentalRateTier,
  RentalWithUnit,
  Unit,
  UnitCost,
} from "./types";

export class AdminRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? "Request failed.";
    throw new AdminRequestError(message, res.status);
  }
  return data as T;
}

export type StarlinkOverview = {
  units: Unit[];
  rentals: RentalWithUnit[];
  costs: UnitCost[];
  rates: RentalRateTier[];
  adSpend: AdSpendRate[];
};

/** Cheap identity of an overview payload, so a quiet poll can skip setState. */
export function stampOverview(data: StarlinkOverview): string {
  return [
    data.rentals.map((r) => `${r.id}:${r.updated_at}`).join(),
    data.units.map((u) => `${u.id}:${u.name}:${u.color}:${u.active}`).join(),
    data.costs
      .map((c) => `${c.id}:${c.monthly_cost}:${c.plan_name}:${c.effective_from}`)
      .join(),
    data.rates.map((r) => `${r.id}:${r.updated_at}`).join(),
    data.adSpend
      .map((a) => `${a.id}:${a.daily_cost}:${a.effective_from}`)
      .join(),
  ].join("|");
}

export async function fetchOverview(init?: {
  signal?: AbortSignal;
}): Promise<StarlinkOverview> {
  const res = await fetch("/api/starlink-admin/overview", {
    cache: "no-store",
    signal: init?.signal,
  });
  const data = await jsonOrThrow<{
    units: Unit[];
    rentals: RentalWithUnit[];
    costs?: UnitCost[];
    rates?: RentalRateTier[];
    adSpend?: AdSpendRate[];
  }>(res);
  return {
    ...data,
    costs: data.costs ?? [],
    rates: data.rates ?? [],
    adSpend: data.adSpend ?? [],
  };
}

export async function createUnit(body: Record<string, unknown>): Promise<{ unit: Unit }> {
  const res = await fetch("/api/starlink-admin/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function updateUnit(
  id: string,
  body: Record<string, unknown>,
): Promise<{ unit: Unit }> {
  const res = await fetch(`/api/starlink-admin/units/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function deleteUnit(id: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/starlink-admin/units/${id}`, { method: "DELETE" });
  return jsonOrThrow(res);
}

export async function upsertUnitCost(
  unitId: string,
  body: { monthly_cost: number; plan_name?: string | null; effective_from?: string },
): Promise<{ cost: UnitCost }> {
  const res = await fetch(`/api/starlink-admin/units/${unitId}/costs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function replaceRateTiers(
  tiers: Array<{ min_days: number; max_days: number; amount: number }>,
): Promise<{ rates: RentalRateTier[] }> {
  const res = await fetch("/api/starlink-admin/rates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tiers }),
  });
  return jsonOrThrow(res);
}

export async function upsertAdSpend(body: {
  daily_cost: number;
  effective_from?: string;
}): Promise<{ rate: AdSpendRate }> {
  const res = await fetch("/api/starlink-admin/ad-spend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function createRental(
  body: Record<string, unknown>,
): Promise<{ rental: RentalWithUnit }> {
  const res = await fetch("/api/starlink-admin/rentals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function updateRental(
  id: string,
  body: Record<string, unknown>,
): Promise<{ rental: RentalWithUnit }> {
  const res = await fetch(`/api/starlink-admin/rentals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export async function deleteRental(id: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/starlink-admin/rentals/${id}`, {
    method: "DELETE",
  });
  return jsonOrThrow(res);
}
