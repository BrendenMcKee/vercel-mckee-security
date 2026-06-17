import type { Metadata } from "next";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Starlink Installation",
  description:
    "Professional Starlink Gen 3 satellite internet installation with no roof penetration in Haliburton, Ontario.",
};

export default function StarlinkPage() {
  return <ElementorServicePage slug="starlink" />;
}
