import security from "@/content/elementor/security.json";
import camera from "@/content/elementor/camera-surveillance.json";
import networking from "@/content/elementor/networking-cellular-expansion.json";
import audioVideo from "@/content/elementor/audio-video.json";
import starlink from "@/content/elementor/starlink.json";
import starlinkRental from "@/content/elementor/starlink-rental.json";
import voipPhoneService from "@/content/elementor/voip-phone-service.json";

export type ElementorPageData = {
  wrapperId: string;
  mainId?: string;
  particleClass: string;
  formWrapperClass: string;
  ctaSectionClass?: string;
  ctaTitle?: string;
  ctaText?: string;
  includeMonitoring?: boolean;
  scopeClass?: string;
  html: string;
};

export const elementorPages: Record<string, ElementorPageData> = {
  security: security as ElementorPageData,
  "camera-surveillance": camera as ElementorPageData,
  "networking-cellular-expansion": networking as ElementorPageData,
  "audio-video": audioVideo as ElementorPageData,
  "voip-phone-service": voipPhoneService as ElementorPageData,
  starlink: starlink as ElementorPageData,
  "starlink-rental": starlinkRental as ElementorPageData,
};

export function getElementorPage(slug: string) {
  return elementorPages[slug];
}
