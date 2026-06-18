import { DATA_DROPS_API_BASE } from "./config";
import type { DateEntry, Drop, Site } from "./types";

/** Sentinel the backend interprets as "clear this signature". */
export const REVOKE_SIGNATURE = "REVOKE_SIGNATURE";

export class DataDropsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DataDropsApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";

  const res = await fetch(`${DATA_DROPS_API_BASE}${path}${qs}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const record = (data ?? {}) as Record<string, unknown>;
    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      `Request failed (${res.status}).`;
    throw new DataDropsApiError(res.status, message);
  }

  return data as T;
}

type Ok = { success: boolean; message?: string };
type DateEnvelope = Ok & { dateData?: DateEntry[] };
type DropsEnvelope = Ok & { dropsData?: Drop[] };

/* ----------------------------- Sites ----------------------------- */

export async function listSites(domain: string): Promise<Site[]> {
  const sites = await request<Site[]>("/sites", { query: { domain } });
  return [...sites].sort((a, b) => a.id - b.id);
}

export function createSite(input: {
  site_name: string;
  site_code: string;
  site_domain: string;
}): Promise<unknown> {
  return request("/sites", { method: "POST", body: input });
}

export function updateSite(
  id: number,
  input: {
    site_name: string;
    site_code: string;
    old_site_name: string;
    site_domain: string;
  },
): Promise<unknown> {
  return request(`/sites/${id}`, { method: "PUT", body: input });
}

export function deleteSite(
  id: number,
  input: { admin_password: string; site_domain: string },
): Promise<unknown> {
  return request(`/sites/${id}`, { method: "DELETE", body: input });
}

/* -------------------------- Network data -------------------------- */

export function getDates(
  siteName: string,
  siteDomain: string,
): Promise<DateEnvelope> {
  return request(`/network-data/date/${encodeURIComponent(siteName)}`, {
    method: "POST",
    body: { site_domain: siteDomain },
  });
}

export function getAllDrops(
  siteName: string,
  siteDomain: string,
): Promise<DropsEnvelope> {
  return request(`/network-data/drops/${encodeURIComponent(siteName)}`, {
    method: "POST",
    body: { site_domain: siteDomain },
  });
}

export function getDropsByDate(
  siteName: string,
  date: string,
  siteDomain: string,
): Promise<DropsEnvelope> {
  return request("/network-data/drops-by-date", {
    method: "POST",
    body: { site_name: siteName, date, site_domain: siteDomain },
  });
}

export function initializeSite(input: {
  site_name: string;
  date: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/site/initialize", {
    method: "POST",
    body: input,
  });
}

export function addDrop(input: {
  site_name: string;
  data_label: string;
  data_location: string;
  data_techs: string | null;
  date: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/drops", { method: "POST", body: input });
}

export function updateDrop(input: {
  site_name: string;
  old_label: string;
  new_label: string;
  location: string;
  techs_data: string;
  date: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/drops", { method: "PUT", body: input });
}

export function deleteDrop(input: {
  site_name: string;
  data_label: string;
  admin_password: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/drops", { method: "DELETE", body: input });
}

export function deleteDay(input: {
  site_name: string;
  date: string;
  admin_password: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/site-data-by-date", {
    method: "DELETE",
    body: input,
  });
}

export function updateDate(input: {
  site_name: string;
  old_date: string;
  new_date: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/network-data/update-date", { method: "PUT", body: input });
}

export function updateSignature(input: {
  site_name: string;
  date: string;
  site_domain: string;
  signature_tech?: string;
  signature_admin?: string;
}): Promise<Ok> {
  return request("/network-data/signatures", { method: "PUT", body: input });
}

export function notifySigner(input: {
  email: string;
  site_name: string;
  date: string;
  domain: string;
  site_domain: string;
}): Promise<Ok> {
  return request("/notify-signer", { method: "POST", body: input });
}
