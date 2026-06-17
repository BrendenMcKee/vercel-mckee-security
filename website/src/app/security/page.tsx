import type { Metadata } from "next";
import { ServicePageView } from "@/components/pages/service-page-view";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Professional residential and commercial security systems with 24/7 ULC monitoring and Total Connect 2.0 in Haliburton, Ontario.",
};

export default function SecurityPage() {
  return <ServicePageView slug="security" />;
}
