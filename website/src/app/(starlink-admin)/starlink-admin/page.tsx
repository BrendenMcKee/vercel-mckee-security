import type { Metadata } from "next";
import { StarlinkAdminApp } from "@/components/starlink-admin/starlink-admin-app";

export const metadata: Metadata = {
  title: "Starlink Rentals - Internal",
  robots: { index: false, follow: false },
};

export default function StarlinkAdminPage() {
  return <StarlinkAdminApp />;
}
