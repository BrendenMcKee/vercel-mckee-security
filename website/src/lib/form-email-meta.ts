import { services } from "@/lib/services";

export type FormEmailKind = "contact" | "inquiry" | "apply";

export type ServiceInquirySlug =
  | "security"
  | "camera-surveillance"
  | "networking-cellular-expansion"
  | "audio-video"
  | "starlink"
  | "starlink-rental"
  | "services-hub"
  | "general";

type FormMeta = {
  emoji: string;
  /** Optional multi-glyph header icon (e.g. careers form). */
  iconEmojis?: string[];
  title: string;
  inboxLabel: string;
};

const formKindMeta: Record<FormEmailKind, FormMeta> = {
  contact: {
    emoji: "📩",
    title: "Website Contact",
    inboxLabel: "New inbox message",
  },
  inquiry: {
    emoji: "✨",
    title: "Service Inquiry",
    inboxLabel: "New service inquiry",
  },
  apply: {
    emoji: "🧑‍💼💼",
    iconEmojis: ["🧑‍💼", "💼"],
    title: "Job Application",
    inboxLabel: "New job application",
  },
};

const serviceInquiryMeta: Record<ServiceInquirySlug, FormMeta> = {
  security: {
    emoji: "🔒",
    title: "Security Inquiry",
    inboxLabel: "Security quote request",
  },
  "camera-surveillance": {
    emoji: "📸",
    title: "Camera Surveillance Inquiry",
    inboxLabel: "Camera quote request",
  },
  "networking-cellular-expansion": {
    emoji: "📶",
    title: "Networking Inquiry",
    inboxLabel: "Networking quote request",
  },
  "audio-video": {
    emoji: "🎬",
    title: "Audio / Video Inquiry",
    inboxLabel: "A/V quote request",
  },
  starlink: {
    emoji: "🛰️",
    title: "Starlink Installation Inquiry",
    inboxLabel: "Starlink installation quote request",
  },
  "starlink-rental": {
    emoji: "🛰️",
    title: "Starlink Rental Inquiry",
    inboxLabel: "Starlink rental availability request",
  },
  "services-hub": {
    emoji: "🏠",
    title: "Custom Installation Inquiry",
    inboxLabel: "Custom project quote",
  },
  general: {
    emoji: "✨",
    title: "Service Inquiry",
    inboxLabel: "General quote request",
  },
};

const serviceSlugSet = new Set(services.map((service) => service.slug));

export function resolveServiceInquirySlug(
  serviceSlug?: string | null,
): ServiceInquirySlug {
  if (!serviceSlug) return "general";
  if (serviceSlug === "services-hub") return "services-hub";
  if (serviceSlugSet.has(serviceSlug)) {
    return serviceSlug as ServiceInquirySlug;
  }
  return "general";
}

export function getFormEmailMeta(
  kind: FormEmailKind,
  serviceSlug?: string | null,
): FormMeta {
  if (kind === "inquiry") {
    return serviceInquiryMeta[resolveServiceInquirySlug(serviceSlug)];
  }
  return formKindMeta[kind];
}

export function buildFormEmailSubject(
  kind: FormEmailKind,
  detail?: string,
  serviceSlug?: string | null,
): string {
  const meta = getFormEmailMeta(kind, serviceSlug);
  const clean = detail?.replace(/\s+/g, " ").trim();

  if (clean) {
    return `${meta.emoji} ${meta.title} | ${clean}`;
  }

  return `${meta.emoji} ${meta.title}`;
}

export function getServiceDisplayName(serviceSlug?: string | null): string {
  if (!serviceSlug || serviceSlug === "services-hub") {
    return serviceInquiryMeta["services-hub"].title.replace(" Inquiry", "");
  }

  const service = services.find((entry) => entry.slug === serviceSlug);
  return service?.shortTitle ?? service?.title ?? "Custom Services";
}
