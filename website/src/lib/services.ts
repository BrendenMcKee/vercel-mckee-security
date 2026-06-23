import {
  Camera,
  Lock,
  Network,
  Radio,
  Speaker,
  type LucideIcon,
} from "lucide-react";
import { images } from "./site-config";

export type Service = {
  slug: string;
  href: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  headline: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  image: string;
};

export const services: Service[] = [
  {
    slug: "security",
    href: "/security",
    title: "Security / Home Automation",
    shortTitle: "Security",
    eyebrow: "Professional Residential & Commercial Security",
    headline: "Professional Security Systems",
    description:
      "Wireless and hardwired systems tailored to your property. No long-term contracts. Cancel anytime. ULC-listed 24/7 monitoring with Total Connect 2.0 smartphone control.",
    icon: Lock,
    features: [
      "24/7 Monitoring",
      "Intrusion Detection",
      "Smart Alerts",
      "Cellular Communication",
    ],
    image: images.services.securityWireless,
  },
  {
    slug: "camera-surveillance",
    href: "/camera-surveillance",
    title: "Camera Surveillance",
    shortTitle: "Cameras",
    eyebrow: "Professional 4K Camera Surveillance",
    headline: "4K UHD Surveillance",
    description:
      "Uniview UNV camera systems with AI smart detection, remote viewing, and professional NVR recording. Complete property visibility from anywhere.",
    icon: Camera,
    features: [
      "4K Ultra HD",
      "AI Detection",
      "Remote Viewing",
      "NDAA Compliant",
    ],
    image: images.services.cameras,
  },
  {
    slug: "networking-cellular-expansion",
    href: "/networking-cellular-expansion",
    title: "Networking / Cellular Expansion",
    shortTitle: "Networking",
    eyebrow: "Fast Reliable Connectivity Solutions",
    headline: "Wi-Fi 7 Technology",
    description:
      "Enterprise-grade UniFi networking, wireless bridges, and cellular distribution antennas that eliminate dead zones across your property.",
    icon: Network,
    features: [
      "Wi-Fi 7",
      "UniFi Equipment",
      "Wireless Bridges",
      "Cellular Boosting",
    ],
    image: images.services.networking,
  },
  {
    slug: "audio-video",
    href: "/audio-video",
    title: "Home Audio / Video",
    shortTitle: "Audio / Video",
    eyebrow: "Custom A/V Solutions",
    headline: "Your Certified Sonos Dealer",
    description:
      "From TV wall mounts and soundbars to whole-home audio and immersive Dolby Atmos home theater experiences.",
    icon: Speaker,
    features: [
      "Certified Sonos Dealer",
      "TV Mounting",
      "Whole-Home Audio",
      "Home Theater",
    ],
    image: "/images/services/work/av-outdoor-tv-lakeside.jpg",
  },
  {
    slug: "starlink",
    href: "/starlink",
    title: "Starlink Installation",
    shortTitle: "Starlink Installation",
    eyebrow: "Professional Starlink Installation",
    headline: "High-Speed Satellite Internet",
    description:
      "Professional Gen 3 Starlink installation with no roof penetration. We supply mounting hardware, extended cables, and optional UniFi integration.",
    icon: Radio,
    features: [
      "Gen 3 Compatible",
      "No Roof Penetration",
      "All Equipment Provided",
      "UniFi Integration",
    ],
    image: images.services.starlink,
  },
  {
    slug: "starlink-rental",
    href: "/starlink-rental",
    title: "Starlink Rental",
    shortTitle: "Starlink Rental",
    eyebrow: "Portable Starlink Rental",
    headline: "Starlink When You Need It",
    description:
      "Rent a fully configured Starlink Gen2 kit with Roam Max service. Pick up at our Haliburton office, take it anywhere, and return when you are done.",
    icon: Radio,
    features: [
      "Gen2 Auto-Pointing Dish",
      "Roam Max Plan Included",
      "Flexible Rental Terms",
      "Pickup & Return in Haliburton",
    ],
    image: "/images/gallery/starlink-dock-red-chairs.jpg",
  },
];

export const serviceCategories = [
  {
    id: "security",
    label: "SECURITY",
    items: [
      "Complete Home and Business Security Systems",
      "Low Temperature Alarms",
      "24 Hour ULC Monitoring",
      "CCTV and Internet Video Surveillance",
    ],
  },
  {
    id: "audio",
    label: "AUDIO",
    items: [
      "Home Audio Distribution Systems",
      "Home Audio/Video Installation",
      "Theater Surround Sound Systems",
      "Sales and Installation",
    ],
  },
  {
    id: "network",
    label: "NETWORK",
    items: [
      "Network Installation and Diagnosis",
      "Business/Home Structured Wiring",
    ],
  },
  {
    id: "automation",
    label: "HOME AUTOMATION & SMART HOME",
    items: [
      "Control your home with a simple touch on your smartphone",
      "Lighting, temperature, door locks, garage doors, and more",
    ],
  },
] as const;

export function getServiceBySlug(slug: string) {
  return services.find((s) => s.slug === slug);
}
