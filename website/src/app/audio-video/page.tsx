import type { Metadata } from "next";
import "@/styles/audio-video.css";
import { ElementorServicePage } from "@/components/pages/elementor-service-page";

export const metadata: Metadata = {
  title: "Audio / Video",
  description:
    "Certified Sonos dealer for whole-home audio, TV mounting, and home theater in Haliburton, Ontario.",
};

export default function AudioVideoPage() {
  return <ElementorServicePage slug="audio-video" />;
}
