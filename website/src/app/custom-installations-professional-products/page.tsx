import type { Metadata } from "next";
import { ServicesHubContent } from "@/components/pages/services-hub-content";

export const metadata: Metadata = {
  title: "Custom Installations and Professional Products",
  description:
    "Comprehensive technology solutions for residential and commercial properties in Haliburton. Security, cameras, networking, audio/video, and Starlink.",
};

export default function ServicesHubPage() {
  return <ServicesHubContent />;
}
