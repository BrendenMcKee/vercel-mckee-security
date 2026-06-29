import type { RentalWithUnit, Unit } from "./types";

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
    throw new Error(message);
  }
  return data as T;
}

export async function fetchOverview(): Promise<{
  units: Unit[];
  rentals: RentalWithUnit[];
}> {
  const res = await fetch("/api/starlink-admin/overview", { cache: "no-store" });
  return jsonOrThrow(res);
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
