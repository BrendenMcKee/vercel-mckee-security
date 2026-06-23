import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const routes = [
  "",
  "/contact-us",
  "/about-us",
  "/gallery",
  "/custom-installations-professional-products",
  "/security",
  "/camera-surveillance",
  "/networking-cellular-expansion",
  "/audio-video",
  "/starlink",
  "/starlink-rental",
  "/apply-now",
  "/our-courses",
  "/courses/mckee-security-technician",
  "/terms-and-conditions",
  "/privacy-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
