import type { Metadata } from "next";
import { ServicePageView } from "@/components/pages/service-page-view";

export const metadata: Metadata = {
  title: "Starlink Installation",
  description: "Professional Starlink Gen 3 installation with no roof penetration in Haliburton.",
};

export default function StarlinkPage() {
  return <ServicePageView slug="starlink" />;
}
