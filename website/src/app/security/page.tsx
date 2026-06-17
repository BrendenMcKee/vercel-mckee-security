import type { Metadata } from "next";
import "@/styles/security.css";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Professional residential and commercial security systems with 24/7 ULC monitoring and Total Connect 2.0 in Haliburton, Ontario.",
};

export default function SecurityPage() {
  return <ElementorServicePage slug="security" />;
}
