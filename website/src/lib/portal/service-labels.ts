import type { Database } from "@/lib/portal/database.types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type ServiceStatus = Database["public"]["Enums"]["service_status"];

/**
 * Valid tiers per service type (mirrors the services.tier DB CHECK).
 * Monitoring tiers are the four real products from the live site's
 * monitoring section (stakeholder-confirmed 2026-07-05, invoiced annually).
 * VoIP plans are the two current offerings (R42/R50): residential and
 * professional (displayed Commercial). Pricing is the 3.12 rate card in
 * `billing.ts` (base system + additional numbers + commercial seats).
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
  professional: "Commercial",
};

export function isVoipService(serviceType: string): boolean {
  return serviceType === "voip";
}

export function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

const LIST_TYPE_ABBREV: Record<string, string> = {
  monitoring: "Mon.",
  voip: "VoIP",
  cloud_backup: "Cloud",
};

const LIST_TIER_ABBREV: Record<string, string> = {
  landline: "Landline",
  cellular: "Cellular",
  cellular_tc: "TC 2.0",
  cellular_tc_home: "TC Home",
  residential: "Residential",
  professional: "Commercial",
  "7day": "7-day",
  "30day": "30-day",
  "90day": "90-day",
};

/** Compact chip for the staff Clients table. Hover shows the full product name. */
export function listServiceChipLabel(input: {
  serviceType: string;
  tier: string;
  status: string;
}): { label: string; title: string } {
  const typeLabel = LIST_TYPE_ABBREV[input.serviceType] ?? input.serviceType;
  const shortTier = LIST_TIER_ABBREV[input.tier] ?? tierLabel(input.tier);
  const fullType = SERVICE_TYPE_LABELS[input.serviceType as ServiceType] ?? input.serviceType;
  const extra = input.status !== "active" ? ` (${input.status})` : "";
  return {
    label: `${typeLabel} · ${shortTier}${extra}`,
    title: `${fullType} · ${tierLabel(input.tier)}${extra}`,
  };
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
};

/**
 * Planned Camera Cloud Backup retention windows mentioned in generic copy.
 * 180-day is preview-only until Track 2; it is not an assignable `services.tier`.
 */
export const CLOUD_BACKUP_PLANNED_RETENTION_COPY =
  "7-Day Retention · 30-Day Retention · 90-Day Retention · 180-Day Retention";

/**
 * Stable per-service colors used on both portals so a glance at a chip,
 * icon, or card tells you which product it is. Monitoring uses the brand
 * primary red (`#c91818`); VoIP is a brighter teal; Camera Cloud Backup is
 * sky. Billing / account chrome stays neutral so it does not look like
 * another security card.
 */
export const SERVICE_THEME: Record<
  ServiceType,
  { chip: string; icon: string; card: string; dot: string }
> = {
  monitoring: {
    chip: "border-primary/45 bg-primary/15 text-red-100",
    icon: "bg-primary/15 text-primary",
    card: "border-2 border-primary/70",
    dot: "bg-primary",
  },
  voip: {
    chip: "border-teal-400/50 bg-teal-400/15 text-teal-50",
    icon: "bg-teal-400/20 text-teal-300",
    card: "border-2 border-teal-400/75",
    dot: "bg-teal-400",
  },
  cloud_backup: {
    chip: "border-sky-400/50 bg-sky-400/15 text-sky-50",
    icon: "bg-sky-400/20 text-sky-300",
    card: "border-2 border-sky-400/75",
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
