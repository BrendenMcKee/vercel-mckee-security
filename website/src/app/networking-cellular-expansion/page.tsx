import type { Metadata } from "next";
import "@/styles/networking-cellular-expansion.css";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Networking / Cellular Expansion",
  description:
    "Enterprise UniFi Wi-Fi 7 networking, cellular expansion, and wireless bridges in Haliburton, Ontario.",
};

export default function NetworkingPage() {
  return <ElementorServicePage slug="networking-cellular-expansion" />;
}
