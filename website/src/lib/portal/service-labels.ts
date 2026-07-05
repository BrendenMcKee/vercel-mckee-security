import type { Database } from "@/lib/portal/database.types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type ServiceStatus = Database["public"]["Enums"]["service_status"];

/**
 * Valid tiers per service type (mirrors the services.tier DB CHECK).
 * Monitoring tiers are the four real products from the live site's
 * monitoring section; pricing lives in `billing.ts` (stakeholder-confirmed
 * 2026-07-05, invoiced annually).
 */
export const SERVICE_TIERS: Record<ServiceType, readonly string[]> = {
  monitoring: ["landline", "cellular", "cellular_tc", "cellular_tc_home"],
  cloud_backup: ["7day", "30day", "90day"],
} as const;

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  monitoring: "Security Monitoring",
  cloud_backup: "Camera Cloud Backup",
};

const TIER_LABELS: Record<string, string> = {
  landline: "Telephone Land Line",
  cellular: "Cellular Communicator",
  cellular_tc: "Cellular + Total Connect 2.0",
  cellular_tc_home: "Cellular + Total Connect Home Automation",
  "7day": "7-Day Retention",
  "30day": "30-Day Retention",
  "90day": "90-Day Retention",
};

export function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
};
