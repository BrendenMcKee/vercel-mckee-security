import type { Metadata } from "next";
import { ServicePageView } from "@/components/pages/service-page-view";

export const metadata: Metadata = {
  title: "Networking and Cellular Expansion",
  description: "UniFi Wi-Fi 7 networking, wireless bridges, and cellular distribution in Haliburton.",
};

export default function NetworkingPage() {
  return <ServicePageView slug="networking-cellular-expansion" />;
}
