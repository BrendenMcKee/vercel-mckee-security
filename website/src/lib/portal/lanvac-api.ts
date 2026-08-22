import "server-only";

/**
 * Server-only Lanvac HTTP client (R54). Dealer password never leaves this
 * module. Prefer POST: GET + body fails in browsers, same as EmergencyContact.
 * Never call /api/Account/status (disable) or /api/Account/new (erase).
 */

export const LANVAC_WRITE_TEST_ACCOUNT = "O5985";
export const LANVAC_HISTORIC_PAGE_SIZE = 50;

export type LanvacAccountRead = {
  panelType: string;
  isDisabled: boolean;
  language: string;
  accountType: string;
};

export type LanvacZoneRead = {
  zoneNumber: number;
  onTest: boolean;
  description: string;
  zoneType: string;
};

export type LanvacHistoricRead = {
  description: string;
  signal: string;
  date: string;
};

type LanvacOk<T> = { ok: true; data: T };
type LanvacErr = { ok: false; error: string; status: number };
export type LanvacResult<T> = LanvacOk<T> | LanvacErr;

function dealerEnv():
  | { ok: true; base: string; dealerAccount: string; password: string }
  | { ok: false; error: string } {
  const base = (process.env.LANVAC_API_BASE ?? "https://lanvac.mobi:8843").replace(
    /\/$/,
    "",
  );
  const dealerAccount = process.env.LANVAC_DEALER_ACCOUNT ?? "10638";
  const password = process.env.LANVAC_DEALER_PASSWORD;
  if (!password) {
    return { ok: false, error: "The station connection is not configured." };
  }
  return { ok: true, base, dealerAccount, password };
}

function dealerIdentity(env: { dealerAccount: string; password: string }) {
  return { dealerAccount: env.dealerAccount, password: env.password };
}

async function postJson(path: string, body: Record<string, unknown>): Promise<
  | { ok: true; json: unknown; status: number }
  | { ok: false; error: string; status: number }
> {
  const env = dealerEnv();
  if (!env.ok) return { ok: false, error: env.error, status: 0 };

  const url = `${env.base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { ok: false, error: "Could not reach the monitoring station.", status: 0 };
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return {
      ok: false,
      error: "Could not read the station.",
      status: res.status,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: "Could not read the station.",
      status: res.status,
    };
  }

  return { ok: true, json, status: res.status };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function lanvacWritesLive(account: string): boolean {
  return account.trim().toUpperCase() === LANVAC_WRITE_TEST_ACCOUNT;
}

export async function fetchLanvacAccount(
  account: string,
): Promise<LanvacResult<LanvacAccountRead>> {
  const env = dealerEnv();
  if (!env.ok) return { ok: false, error: env.error, status: 0 };

  const posted = await postJson("/api/Account", {
    dealerIdentity: dealerIdentity(env),
    account,
  });
  if (!posted.ok) return posted;

  const row = asRecord(posted.json);
  if (!row) return { ok: false, error: "Station account response was empty.", status: posted.status };

  return {
    ok: true,
    data: {
      panelType: asString(row.panelType),
      isDisabled: asBoolean(row.isDisabled),
      language: asString(row.language),
      accountType: asString(row.accountType),
    },
  };
}

export async function fetchLanvacZones(
  account: string,
): Promise<LanvacResult<LanvacZoneRead[]>> {
  const env = dealerEnv();
  if (!env.ok) return { ok: false, error: env.error, status: 0 };

  const posted = await postJson("/api/Zone", {
    dealerIdentity: dealerIdentity(env),
    account,
  });
  if (!posted.ok) return posted;

  if (!Array.isArray(posted.json)) {
    return { ok: false, error: "Station zone list was empty.", status: posted.status };
  }

  const zones: LanvacZoneRead[] = [];
  for (const item of posted.json) {
    const row = asRecord(item);
    if (!row) continue;
    const zoneNumber = asNumber(row.zoneNumber);
    if (zoneNumber == null || zoneNumber < 1 || zoneNumber > 999) continue;
    zones.push({
      zoneNumber,
      onTest: asBoolean(row.onTest),
      description: asString(row.description).slice(0, 200),
      zoneType: asString(row.zoneType).slice(0, 80),
    });
  }

  return { ok: true, data: zones };
}

export async function fetchLanvacHistoric(
  account: string,
  options: { currentPage?: number; elementsPerPage?: number } = {},
): Promise<LanvacResult<LanvacHistoricRead[]>> {
  const env = dealerEnv();
  if (!env.ok) return { ok: false, error: env.error, status: 0 };

  const currentPage = options.currentPage ?? 1;
  const elementsPerPage = options.elementsPerPage ?? LANVAC_HISTORIC_PAGE_SIZE;

  const posted = await postJson("/api/Historic", {
    dealerIdentity: dealerIdentity(env),
    account,
    currentPage,
    elementsPerPage,
  });
  if (!posted.ok) return posted;

  if (!Array.isArray(posted.json)) {
    return { ok: false, error: "Station signal log was empty.", status: posted.status };
  }

  const rows: LanvacHistoricRead[] = [];
  for (const item of posted.json) {
    const row = asRecord(item);
    if (!row) continue;
    rows.push({
      description: asString(row.description).slice(0, 400),
      signal: asString(row.signal).slice(0, 40),
      date: asString(row.date).slice(0, 40),
    });
  }

  return { ok: true, data: rows };
}
