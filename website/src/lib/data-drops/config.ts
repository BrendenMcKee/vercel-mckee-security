export type DataDropsTenant = "hhhs" | "mckeesecurity";

export type TenantConfig = {
  /** Sent to the API as the `domain` query param / `site_domain` body field. */
  domain: DataDropsTenant;
  /** Public route path (also used to build signature-request email links). */
  slug: string;
  /** Display name shown in the UI header. */
  name: string;
  /** Short label/badge. */
  shortName: string;
};

export const DATA_DROPS_TENANTS: Record<DataDropsTenant, TenantConfig> = {
  hhhs: {
    domain: "hhhs",
    slug: "/data-drops-hhhs",
    name: "Haliburton Highlands Health Services",
    shortName: "HHHS",
  },
  mckeesecurity: {
    domain: "mckeesecurity",
    slug: "/data-drops-mckeesecurity",
    name: "McKee Security",
    shortName: "Internal",
  },
};

/**
 * Same-origin base for all data API calls. A Next route handler at this path
 * forwards requests to the AWS backend server-side, so the browser never makes a
 * cross-origin call (no CORS) and the AWS origin is never shipped to the client.
 */
export const DATA_DROPS_API_BASE = "/api/dd";
