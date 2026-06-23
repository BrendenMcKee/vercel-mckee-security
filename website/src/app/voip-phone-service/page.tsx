import type { Metadata } from "next";
import "@/styles/starlink.css";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "VoIP Phone Service",
  description:
    "Professional hosted VoIP phone service for homes and businesses in Haliburton, Ontario. Yealink hardware, local support, and managed number porting from McKee Security.",
};

export default function VoipPhoneServicePage() {
  return <ElementorServicePage slug="voip-phone-service" />;
}
