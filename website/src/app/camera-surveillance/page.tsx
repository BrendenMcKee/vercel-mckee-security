import type { Metadata } from "next";
import { ServicePageView } from "@/components/pages/service-page-view";

export const metadata: Metadata = {
  title: "Camera Surveillance",
  description: "Professional 4K Uniview UNV camera systems with AI detection and remote viewing.",
};

export default function CameraPage() {
  return <ServicePageView slug="camera-surveillance" />;
}
