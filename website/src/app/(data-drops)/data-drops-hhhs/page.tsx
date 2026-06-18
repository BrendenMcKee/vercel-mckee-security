import type { Metadata } from "next";
import { DataDropsApp } from "@/components/data-drops/data-drops-app";

export const metadata: Metadata = {
  title: "Data Drops - HHHS",
  robots: { index: false, follow: false },
};

export default function DataDropsHhhsPage() {
  return <DataDropsApp tenant="hhhs" />;
}
