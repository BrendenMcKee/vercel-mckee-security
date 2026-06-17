import type { Metadata } from "next";
import { ServicePageView } from "@/components/pages/service-page-view";

export const metadata: Metadata = {
  title: "Audio and Video",
  description: "Certified Sonos dealer for whole-home audio, home theater, and TV installation.",
};

export default function AudioVideoPage() {
  return <ServicePageView slug="audio-video" />;
}
