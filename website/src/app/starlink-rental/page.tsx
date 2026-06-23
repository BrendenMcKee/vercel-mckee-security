import type { Metadata } from "next";
import "@/styles/starlink.css";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Starlink Rental",
  description:
    "Rent a fully configured Starlink Gen2 kit with Roam Max service from McKee Security in Haliburton, Ontario. Inquire for availability and pricing.",
};

export default function StarlinkRentalPage() {
  return <ElementorServicePage slug="starlink-rental" />;
}
