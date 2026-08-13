import type { Database } from "@/lib/portal/database.types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type ServiceStatus = Database["public"]["Enums"]["service_status"];

/**
 * Valid tiers per service type (mirrors the services.tier DB CHECK).
 * Monitoring tiers are the four real products from the live site's
 * monitoring section (stakeholder-confirmed 2026-07-05, invoiced annually).
 * VoIP plans are the two current offerings (stakeholder 2026-07-18, R42;
 * interim pricing while the tier structure settles, D14). Pricing lives in
 * `billing.ts`.
 */
export const SERVICE_TIERS: Record<ServiceType, readonly string[]> = {
  monitoring: ["landline", "cellular", "cellular_tc", "cellular_tc_home"],
  cloud_backup: ["7day", "30day", "90day"],
  voip: ["residential", "professional"],
} as const;

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  monitoring: "Security Monitoring",
  cloud_backup: "Camera Cloud Backup",
  voip: "VoIP Phone Service",
};

export type ServiceLaunchStatus = "available" | "in_development";

/**
 * Product-level feature gate. Camera Cloud Backup stays visible as a planning
 * template, but cannot be assigned until Track 2's ingestion and retrieval
 * gates have passed. Flip this only as part of that launch.
 */
export const SERVICE_LAUNCH_STATUS: Record<ServiceType, ServiceLaunchStatus> = {
  monitoring: "available",
  cloud_backup: "in_development",
  voip: "available",
};

export const CLOUD_BACKUP_DEVELOPMENT_MESSAGE =
  "Camera Cloud Backup is still in development and cannot be assigned yet.";

export function isServiceAvailable(serviceType: ServiceType): boolean {
  return SERVICE_LAUNCH_STATUS[serviceType] === "available";
}

const TIER_LABELS: Record<string, string> = {
  landline: "Telephone Land Line",
  cellular: "Cellular Communicator",
  cellular_tc: "Cellular + Total Connect 2.0",
  cellular_tc_home: "Cellular + Total Connect Home Automation",
  "7day": "7-Day Retention",
  "30day": "30-Day Retention",
  "90day": "90-Day Retention",
  residential: "Residential Unlimited Canada-Wide",
  professional: "Business",
};

/**
 * Service types whose plans are priced per line (Stripe quantity = lines).
 * Every VoIP plan is per line (stakeholder 2026-07-18): even residential
 * customers can carry more than one line (a fax line, for example).
 */
export function isPerLineService(serviceType: string, _tier?: string): boolean {
  return serviceType === "voip";
}

export function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
};

/**
 * Stable per-service colors used on both portals so a glance at a chip,
 * icon, or card tells you which product it is. Monitoring stays brand red;
 * VoIP is teal; Camera Cloud Backup is sky. Billing uses brand red because
 * it is company-wide, not a product.
 */
export const SERVICE_THEME: Record<
  ServiceType,
  { chip: string; icon: string; card: string; dot: string }
> = {
  monitoring: {
    chip: "border-red-500/40 bg-red-500/15 text-red-100",
    icon: "bg-red-500/15 text-red-400",
    card: "border-red-500/25",
    dot: "bg-red-400",
  },
  voip: {
    chip: "border-teal-500/40 bg-teal-500/15 text-teal-100",
    icon: "bg-teal-500/15 text-teal-300",
    card: "border-teal-500/25",
    dot: "bg-teal-400",
  },
  cloud_backup: {
    chip: "border-sky-500/40 bg-sky-500/15 text-sky-100",
    icon: "bg-sky-500/15 text-sky-300",
    card: "border-sky-500/25",
    dot: "bg-sky-400",
  },
};

export function serviceChipClass(serviceType: string): string {
  return SERVICE_THEME[serviceType as ServiceType]?.chip ?? "border-white/15 bg-white/5 text-white/70";
}

/** Current (not cancelled) security monitoring. Caller ID and devices belong here. */
export function hasCurrentMonitoring(
  services: ReadonlyArray<{ service_type: string; status: string }>,
): boolean {
  return services.some((service) => service.service_type === "monitoring" && service.status !== "cancelled");
}
