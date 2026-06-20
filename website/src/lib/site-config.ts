export type NavChild = {
  label: string;
  href: string;
  icon?: "home" | "lock" | "camera" | "network" | "tv" | "satellite";
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
};

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "About Us", href: "/about-us" },
  { label: "Gallery", href: "/gallery" },
  {
    label: "Our Services",
    href: "/custom-installations-professional-products",
    children: [
      {
        label: "Our Services",
        href: "/custom-installations-professional-products",
        icon: "home",
      },
      { label: "Security", href: "/security", icon: "lock" },
      {
        label: "Camera Surveillance",
        href: "/camera-surveillance",
        icon: "camera",
      },
      {
        label: "Networking / Cellular Expansion",
        href: "/networking-cellular-expansion",
        icon: "network",
      },
      { label: "Audio / Video", href: "/audio-video", icon: "tv" },
      { label: "Starlink", href: "/starlink", icon: "satellite" },
    ],
  },
];

/** @deprecated Use mainNav instead */
export const primaryNav = mainNav.flatMap((item) =>
  item.children
    ? [{ label: item.label, href: item.href }, ...item.children]
    : [item],
);

export const siteConfig = {
  name: "McKee Security & Audio Systems",
  tagline: "A viable technology solution",
  description:
    "Custom security, camera surveillance, networking, audio and video, and Starlink installation for homes and businesses in Haliburton, Ontario.",
  url: "https://mckeesecurity.ca",
  foundedYear: 1994,
  yearsInBusiness: 30,
  region: "Haliburton region, Ontario, Canada",
  hours: "Mon-Fri 8:00am - 4:00pm",
  topBarLeftTagline: "Specialists in Quality Service Since 1994",
  topBarRightTagline: "Leading Industry Professionals",
  address: {
    street: "4702 Haliburton County Rd 21",
    city: "Haliburton",
    province: "ON",
    postalCode: "K0M 1S0",
    country: "Canada",
    full: "4702 Haliburton County Rd 21, Haliburton, ON K0M 1S0",
  },
  phone: {
    display: "+1 705 457 2156",
    tel: "+17054572156",
    short: "(705) 457-2156",
  },
  email: {
    general: "info@mckeesecurity.ca",
    contacts: [
      {
        name: "Dennis McKee",
        title: "Owner-Operator",
        email: "dennis@mckeesecurity.ca",
      },
      {
        name: "Andi Donaldson",
        title: "Administrative Manager",
        email: "andi@mckeesecurity.ca",
      },
      {
        name: "Brenden McKee",
        title: "Owner-Operator, Technical Director",
        email: "brenden@mckeesecurity.ca",
      },
    ],
  },
  social: {
    facebook: "https://www.facebook.com/McKeeTechnologySolutions",
    instagram: "https://www.instagram.com/mckeesecurity/",
    youtube: "https://www.youtube.com/channel/UCJxaxUSwhF3InTs5fE8hCDg",
  },
  certifications: [
    "ULC-listed monitoring",
    "Certified Sonos dealer",
    "Fiber certified networking",
    "NDAA compliant camera systems",
  ],
} as const;

export const footerNav = [
  { label: "Our Courses", href: "/our-courses" },
  { label: "Apply Now", href: "/apply-now" },
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

export type TeamLink = {
  type: "email" | "instagram" | "tiktok";
  href: string;
  label: string;
};

export type TeamMember = {
  name: string;
  role: string;
  photo: string;
  links?: TeamLink[];
};

export const team: TeamMember[] = [
  {
    name: "Maurice & Mary McKee",
    role: "Founders",
    photo: "/images/team/maurice-mary.jpg",
  },
  {
    name: "Brenden McKee",
    role: "Owner-Operator, Technical Director",
    photo: "/images/team/brenden-mckee.png",
    links: [
      { type: "instagram", href: "https://www.instagram.com/brendenmckee/", label: "Instagram" },
      { type: "email", href: "mailto:brenden@mckeesecurity.ca", label: "Email" },
    ],
  },
  {
    name: "Dennis McKee",
    role: "Co-Owner",
    photo: "/images/team/dennis-mckee.jpg",
    links: [{ type: "email", href: "mailto:dennis@mckeesecurity.ca", label: "Email" }],
  },
  {
    name: "Brenda McKee",
    role: "Co-Owner",
    photo: "/images/team/brenda-mckee.jpg",
    links: [{ type: "email", href: "mailto:brenda@mckeesecurity.ca", label: "Email" }],
  },
  {
    name: "Andi Donaldson",
    role: "Administrative Manager",
    photo: "/images/team/andi-donaldson.png",
    links: [{ type: "email", href: "mailto:andi@mckeesecurity.ca", label: "Email" }],
  },
  {
    name: "Austin Reeve",
    role: "Master Technician, Networking Specialist",
    photo: "/images/team/austin-reeve.png",
  },
  {
    name: "Talon Dakin",
    role: "Master Technician, Training Specialist",
    photo: "/images/team/talon-dakin.png",
    links: [
      { type: "instagram", href: "https://www.instagram.com/talondakin/", label: "Instagram" },
    ],
  },
  {
    name: "Daniel Murdoch",
    role: "Professional Technician",
    photo: "/images/team/daniel-murdoch.png",
    links: [
      {
        type: "tiktok",
        href: "https://www.tiktok.com/@danielmurdoch?lang=en",
        label: "TikTok",
      },
    ],
  },
  {
    name: "Ethan Wildman",
    role: "Professional Technician",
    photo: "/images/team/ethan-wildman.png",
    links: [
      {
        type: "instagram",
        href: "https://www.instagram.com/wildmancopywrites/",
        label: "Instagram",
      },
    ],
  },
];

export const heritageBlurb =
  "For over 30 years, McKee Security has served families and businesses throughout the Haliburton region. Founded by Maurice McKee and now led by third-generation owner Brenden McKee, we have built our reputation on professional installation, honest service, and cutting-edge technology.";

export const images = {
  heroHome: "/images/hero-home.jpg",
  heroAbout: "/images/hero-about.jpg",
  heroContact: "/images/hero-contact.jpg",
  bannerDesktop: "/images/shield-logo.png",
  bannerMobile: "/images/shield-logo.png",
  browseServicesBg: "/images/browse-services-bg.jpg",
  hat: "/images/shield-logo.png",
  teamInstall: "/images/team-install.jpg",
  sonosBg: "/images/sonos-bg.jpg",
  logo: "/images/logo.png",
  shieldLogo: "/images/shield-logo.png",
  favicon: "/images/favicon-192.png",
  services: {
    securityWireless: "/images/services/security-wireless.jpg",
    securityWired: "/images/services/security-wired.jpg",
    securityFacilities: "/images/services/security-facilities.jpg",
    totalConnect: "/images/services/total-connect.png",
    cameras: "/images/services/cameras.png",
    networking: "/images/services/networking.png",
    starlink: "/images/services/starlink.jpg",
    honeywell: "/images/services/honeywell.jpg",
  },
} as const;
