import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DD_COOKIE, isUnlocked } from "@/lib/data-drops/gate";
import { DataDropsLock } from "@/components/data-drops/data-drops-lock";
import "@/styles/data-drops.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DataDropsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const unlocked = isUnlocked(store.get(DD_COOKIE)?.value);
  return (
    <div className="data-drops-app">{unlocked ? children : <DataDropsLock />}</div>
  );
}
