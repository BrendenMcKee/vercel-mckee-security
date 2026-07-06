import { createPortalServerClient } from "@/lib/portal/supabase/server";
import {
  AdminDevicesPanel,
  type AdminDeviceRow,
} from "@/components/admin-portal/admin-devices-panel";

/**
 * Devices tab (stakeholder round 4): every tracked device across every
 * client in one list, sorted by soonest replacement, filterable by category
 * (system batteries, smoke detectors, wireless devices...) and by due
 * status. This is where "what needs replacing soon?" gets answered without
 * opening clients one by one.
 */
export async function AdminDevices() {
  const supabase = await createPortalServerClient();

  const { data: devices, error } = await supabase
    .from("devices")
    .select("id, label, category, installed_on, lifetime_years, profiles(id, first_name, last_name)")
    .order("installed_on", { ascending: true });

  if (error) {
    console.error("[portal] Devices tab query failed:", error);
    throw new Error("Devices failed to load.");
  }

  const rows: AdminDeviceRow[] = (devices ?? [])
    .filter((d) => d.profiles)
    .map((d) => ({
      id: d.id,
      label: d.label,
      category: d.category,
      installedOn: d.installed_on,
      lifetimeYears: d.lifetime_years,
      profileId: d.profiles!.id,
      clientName: `${d.profiles!.first_name} ${d.profiles!.last_name}`,
    }));

  return <AdminDevicesPanel devices={rows} />;
}
