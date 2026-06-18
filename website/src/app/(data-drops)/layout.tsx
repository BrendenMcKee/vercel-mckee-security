import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DD_COOKIE, isUnlocked } from "@/lib/data-drops/gate";
import { DataDropsLock } from "@/components/data-drops/data-drops-lock";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DataDropsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  if (!isUnlocked(store.get(DD_COOKIE)?.value)) {
    return <DataDropsLock />;
  }
  return <>{children}</>;
}
