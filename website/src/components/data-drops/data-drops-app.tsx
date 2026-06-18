"use client";

import { ToastProvider } from "./ui/toast";
import { SiteSelector } from "./site-selector";
import {
  DATA_DROPS_TENANTS,
  type DataDropsTenant,
} from "@/lib/data-drops/config";

export function DataDropsApp({ tenant }: { tenant: DataDropsTenant }) {
  const config = DATA_DROPS_TENANTS[tenant];

  return (
    <ToastProvider>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <SiteSelector tenant={config} />
      </div>
    </ToastProvider>
  );
}
