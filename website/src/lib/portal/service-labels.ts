import type { Database } from "@/lib/portal/database.types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type ServiceStatus = Database["public"]["Enums"]["service_status"];

/** Valid tiers per service type (mirrors the services.tier DB CHECK). */
export const SERVICE_TIERS: Record<ServiceType, readonly string[]> = {
  monitoring: ["basic", "standard", "pro"],
  cloud_backup: ["7day", "30day", "90day"],
} as const;

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  monitoring: "Security Monitoring",
  cloud_backup: "Camera Cloud Backup",
};

const TIER_LABELS: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  pro: "Pro",
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
