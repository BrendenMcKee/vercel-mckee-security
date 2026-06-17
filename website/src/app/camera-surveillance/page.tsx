import type { Metadata } from "next";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Camera Surveillance",
  description:
    "Uniview UNV 4K UHD camera systems with AI detection and remote viewing in Haliburton, Ontario.",
};

export default function CameraSurveillancePage() {
  return <ElementorServicePage slug="camera-surveillance" />;
}
