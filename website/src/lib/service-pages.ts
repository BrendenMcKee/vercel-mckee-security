import type { Service } from "./services";

export type FeatureBlock = {
  title: string;
  description: string;
  bullets: string[];
};

export type ServicePageContent = Omit<Service, "icon" | "image"> & {
  icon?: Service["icon"];
  image?: string;
  heroSubtitle: string;
  intro: string;
  featureIcons: { label: string }[];
  blocks: FeatureBlock[];
  valueProps?: { title: string; description: string }[];
};

export const servicePages: Record<string, ServicePageContent> = {
  security: {
    slug: "security",
    href: "/security",
    title: "Security / Home Automation",
    shortTitle: "Security",
    eyebrow: "Professional Residential & Commercial Security Solutions",
    headline: "Professional Security Systems",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "Whether you are securing an existing home or building new, we design wireless and hardwired systems tailored to your property. No long-term contracts. Cancel anytime.",
    intro:
      "A professional security system is your property's first line of defense. Sensors detect unauthorized entry, environmental hazards, and emergencies, instantly alerting both you and our 24/7 monitoring station.",
    featureIcons: [
      { label: "Perimeter Alarm" },
      { label: "Fire Alarm" },
      { label: "Low-Temp Monitoring" },
      { label: "Flood Detection" },
      { label: "24/7 ULC Monitoring" },
      { label: "Insurance Premiums" },
    ],
    blocks: [
      {
        title: "Intrusion Detection",
        description:
          "Door, window, and motion sensors provide comprehensive perimeter protection with professional placement that eliminates false alarms.",
        bullets: [
          "Door Sensors",
          "Window Sensors",
          "Motion Detection",
          "Glass Break",
          "Perimeter Protection",
        ],
      },
      {
        title: "Environmental Monitoring",
        description:
          "Fire, carbon monoxide, flood, and freeze detection protect your property from hazards beyond break-ins.",
        bullets: [
          "Smoke Detection",
          "CO Monitoring",
          "Flood Sensors",
          "Freeze Alerts",
          "24/7 Response",
        ],
      },
      {
        title: "24/7 Professional Monitoring",
        description:
          "ULC-listed monitoring station with 31 years of proven reliability. Trained operators respond immediately.",
        bullets: [
          "ULC Listed",
          "31 Years Experience",
          "Instant Response",
          "Emergency Dispatch",
          "Passcode Verification",
        ],
      },
    ],
    valueProps: [
      {
        title: "Peace of Mind",
        description:
          "Know that your property and loved ones are protected 24/7 whether you are home or away.",
      },
      {
        title: "Insurance Benefits",
        description:
          "Professional monitoring qualifies for significant home insurance discounts.",
      },
      {
        title: "Equipment Ownership",
        description:
          "You own all equipment from day one. No rental fees or long-term contracts required.",
      },
    ],
  },
  "camera-surveillance": {
    slug: "camera-surveillance",
    href: "/camera-surveillance",
    title: "Camera Surveillance",
    shortTitle: "Cameras",
    eyebrow: "Professional 4K Camera Surveillance",
    headline: "4K UHD Surveillance",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "Uniview UNV camera systems provide comprehensive video surveillance with 4K crystal-clear footage and remote viewing from anywhere.",
    intro:
      "With remote viewing capabilities, smart AI detection alerts, and advanced recording features, you can monitor your property from anywhere using your smartphone, tablet, or computer.",
    featureIcons: [
      { label: "3840 x 2160 8MP 4K" },
      { label: "AI Smart Detection" },
      { label: "Remote Viewing" },
      { label: "Local 24/7 Storage" },
      { label: "NDAA Compliant" },
    ],
    blocks: [
      {
        title: "4K Ultra HD",
        description:
          "Uniview UNV cameras deliver exceptional 8MP 4K image quality with AI-enhanced imaging and HDR processing.",
        bullets: [
          "Advanced color night vision",
          "HDR processing",
          "Crystal-clear footage",
        ],
      },
      {
        title: "AI Smart Detection",
        description:
          "Advanced AI distinguishes between humans, vehicles, and false alarms to eliminate unnecessary notifications.",
        bullets: [
          "Human detection",
          "Vehicle detection",
          "Reduced false alerts",
        ],
      },
      {
        title: "Remote Access",
        description:
          "Access your camera system from anywhere using UNV-Link User mobile app or Easy Station 3.0 desktop application.",
        bullets: [
          "Live feeds",
          "Recorded footage review",
          "Instant smart alerts",
        ],
      },
    ],
    valueProps: [
      {
        title: "Complete Visibility",
        description: "Professional camera placement ensures comprehensive coverage of all critical areas.",
      },
      {
        title: "The Deterrent Effect",
        description: "Visible security cameras act as a powerful deterrent to potential intruders.",
      },
      {
        title: "Equipment Ownership",
        description: "You own all equipment and data from day one. Complete data sovereignty on your property.",
      },
    ],
  },
  "networking-cellular-expansion": {
    slug: "networking-cellular-expansion",
    href: "/networking-cellular-expansion",
    title: "Networking / Cellular Expansion",
    shortTitle: "Networking",
    eyebrow: "Fast Reliable Connectivity Solutions",
    headline: "Wi-Fi 7 Technology",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "Tired of losing connectivity? We design, install, and configure enterprise-level Wi-Fi 7 access points, gateways, and POE switches.",
    intro:
      "Transform your connectivity with professional-grade networking solutions. For areas with poor cellular reception, our advanced antenna systems extend strong signals to even the most remote locations.",
    featureIcons: [
      { label: "Wi-Fi 7 4.8x Faster" },
      { label: "Stronger Signal" },
      { label: "Building to Building" },
      { label: "Seamless Roaming" },
      { label: "Secure IDS/IPS" },
      { label: "Remote Support" },
    ],
    blocks: [
      {
        title: "Network Gateways",
        description:
          "UniFi gateways provide powerful routing and firewall capabilities with advanced IDS/IPS protection.",
        bullets: ["Routing", "Firewall", "Threat blocking"],
      },
      {
        title: "Wi-Fi 7 Access Points",
        description:
          "Experience blazing-fast speeds up to 30 Gbps with Multi-Link Operation technology.",
        bullets: ["MLO technology", "320 MHz channels", "Mesh networking"],
      },
      {
        title: "Cellular Distribution",
        description:
          "Eliminate dead zones and dropped calls with comprehensive indoor and outdoor antenna systems.",
        bullets: ["Indoor antennas", "Outdoor antennas", "Enhanced coverage"],
      },
    ],
    valueProps: [
      {
        title: "Enhanced Performance",
        description: "Optimize speed and reliability with professional-grade Wi-Fi 7 equipment.",
      },
      {
        title: "Expanded Coverage",
        description: "Eliminate Wi-Fi dead zones across your entire property.",
      },
      {
        title: "Fiber Certified",
        description: "Expert installation with lightning immunity and unlimited distance capability.",
      },
    ],
  },
  "audio-video": {
    slug: "audio-video",
    href: "/audio-video",
    title: "Home Audio / Video",
    shortTitle: "Audio / Video",
    eyebrow: "Custom A/V Solutions",
    headline: "Your Certified Sonos Dealer",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "From simple TV wall mounts and soundbars to complete whole-home audio and immersive home theater experiences.",
    intro:
      "As a certified Sonos dealer, we specialize in premium audio-visual installations that bring exceptional sound and picture quality to every room of your home.",
    featureIcons: [
      { label: "Premium Sound Quality" },
      { label: "Whole Home Audio" },
      { label: "Home Theater Experience" },
      { label: "TV/Soundbar Installation" },
      { label: "Outdoor Surround" },
      { label: "Streaming Services" },
    ],
    blocks: [
      {
        title: "TV and Soundbar Installation",
        description:
          "Professional wall-mounting with clean, hidden cable management. Pair with a Sonos soundbar for immersive audio.",
        bullets: ["Wall mounting", "Cable concealment", "Sonos Arc and Beam"],
      },
      {
        title: "Whole-Home Audio",
        description:
          "Multi-room and multi-zone systems using Sonos amps and premium in-ceiling or in-wall speakers.",
        bullets: ["In-ceiling speakers", "Sonos Amp", "Multi-zone control"],
      },
      {
        title: "Home Theater Experience",
        description:
          "Complete surround sound with premium Paradigm speakers and Anthem receivers including Dolby Atmos.",
        bullets: ["5.1 / 7.1 Surround", "Dolby Atmos", "Acoustic optimization"],
      },
    ],
    valueProps: [
      {
        title: "Certified Expertise",
        description: "Training and experience across the complete Sonos and Sonance ecosystem.",
      },
      {
        title: "Custom Design",
        description: "Systems tailored to your rooms and listening habits.",
      },
      {
        title: "Ongoing Support",
        description: "Responsive local support long after installation is complete.",
      },
    ],
  },
  starlink: {
    slug: "starlink",
    href: "/starlink",
    title: "Starlink Installation",
    shortTitle: "Starlink Installation",
    eyebrow: "Professional Starlink Installation",
    headline: "High-Speed Satellite Internet",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "Starlink delivers fast and reliable connectivity where traditional service is unavailable. Professional installation with no roof penetration.",
    intro:
      "The latest Starlink Gen 3 kit delivers speeds up to 400 Mbps with latency as low as 20 to 40ms. You purchase the kit from Starlink and we handle expert installation.",
    featureIcons: [
      { label: "High-Speed Internet" },
      { label: "Low Latency 30-60 ms" },
      { label: "Rural Connectivity" },
      { label: "Professional Installation" },
      { label: "Device Connection" },
      { label: "Network Integration" },
    ],
    blocks: [
      {
        title: "Starlink Gen 3 Performance",
        description:
          "Compact, weather-resistant dish with Wi-Fi 6 tri-band technology supporting up to 235 devices.",
        bullets: ["Up to 400 Mbps", "Wi-Fi 6", "Weather resistant"],
      },
      {
        title: "Professional Installation",
        description:
          "We never puncture roofs. Dishes mount on fascia boards, gable ends, or custom pole mounts.",
        bullets: ["No roof penetration", "Optimal positioning", "Clean cable runs"],
      },
      {
        title: "Advanced Network Integration",
        description:
          "Extend coverage with Starlink mesh nodes or integrate with enterprise UniFi networking.",
        bullets: ["Mesh nodes", "UniFi integration", "Guest networks"],
      },
    ],
    valueProps: [
      {
        title: "Expert Installation",
        description: "Technicians trained specifically in Starlink positioning and cable management.",
      },
      {
        title: "Protect Your Home",
        description: "Mounting solutions that withstand extreme weather without roof drilling.",
      },
      {
        title: "Complete Service",
        description: "From site survey to final configuration, we handle everything.",
      },
    ],
  },
  "starlink-rental": {
    slug: "starlink-rental",
    href: "/starlink-rental",
    title: "Starlink Rental",
    shortTitle: "Starlink Rental",
    eyebrow: "Portable Starlink Rental",
    headline: "Starlink When You Need It",
    description: "",
    icon: {} as Service["icon"],
    features: [],
    heroSubtitle:
      "Rent a fully configured Starlink Gen2 kit with Roam Max service. Pick up at our Haliburton office, take it anywhere, and return when you are done.",
    intro:
      "Our rental kits use Gen2 dishes with actuated auto-pointing motors, arrive pre-configured on the highest Roam plan, and are maintained by the same team that installs permanent Starlink systems across the Haliburton region.",
    featureIcons: [
      { label: "Gen2 Auto-Pointing" },
      { label: "Roam Max Plan" },
      { label: "Flexible Duration" },
      { label: "Pickup & Return" },
      { label: "Availability Based" },
      { label: "Local Support" },
    ],
    blocks: [
      {
        title: "Roam Max Service Included",
        description:
          "Every rental runs Starlink's highest mobile tier so you get the fastest speeds and priority access wherever coverage allows.",
        bullets: ["Roam Max plan", "Use anywhere", "Fastest speeds"],
      },
      {
        title: "Gen2 Kits, Ready to Go",
        description:
          "Starlink Gen2 hardware with an actuated motor automatically aligns to the constellation. No manual pointing required.",
        bullets: ["Auto-pointing dish", "Pre-configured", "Fast setup"],
      },
      {
        title: "Simple Pickup & Return",
        description:
          "Collect and return your kit at 4702 Haliburton County Rd 21. We confirm availability and pricing before reserving a unit.",
        bullets: ["Haliburton pickup", "Flexible rental length", "Inquire for pricing"],
      },
    ],
    valueProps: [
      {
        title: "Professionally Maintained",
        description: "Each rental unit is checked and configured by our in-house Starlink technicians.",
      },
      {
        title: "Built for Mobility",
        description: "Take high-speed internet to the cottage, campsite, job site, or road trip.",
      },
      {
        title: "Easy to Inquire",
        description: "Contact us for availability and pricing based on your dates and rental length.",
      },
    ],
  },
};

export function getServicePageContent(slug: string) {
  return servicePages[slug];
}
