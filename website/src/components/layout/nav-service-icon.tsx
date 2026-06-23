import {
  Home,
  Lock,
  Camera,
  Network,
  Tv,
  Phone,
  Satellite,
  type LucideIcon,
} from "lucide-react";
import type { NavChild } from "@/lib/site-config";

const icons: Record<NonNullable<NavChild["icon"]>, LucideIcon> = {
  home: Home,
  lock: Lock,
  camera: Camera,
  network: Network,
  tv: Tv,
  phone: Phone,
  satellite: Satellite,
};

export function NavServiceIcon({
  icon,
  className = "h-4 w-4 shrink-0 text-primary",
}: {
  icon?: NavChild["icon"];
  className?: string;
}) {
  const Icon = icon ? icons[icon] : Home;
  return <Icon className={className} aria-hidden="true" />;
}
