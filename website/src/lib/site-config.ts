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
  topBarTagline: "Leading Industry Professionals",
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

export const team = [
  {
    name: "Maurice & Mary McKee",
    role: "Founders",
    photo: "/images/team/maurice-mary.jpg",
  },
  {
    name: "Brenden McKee",
    role: "Owner-Operator, Technical Director",
    photo: "/images/team/brenden-mckee.png",
  },
  {
    name: "Dennis McKee",
    role: "Co-Owner",
    photo: "/images/team/dennis-mckee.jpg",
  },
  {
    name: "Brenda McKee",
    role: "Co-Owner",
    photo: "/images/team/brenda-mckee.jpg",
  },
  {
    name: "Andi Donaldson",
    role: "Administrative Manager",
    photo: "/images/team/andi-donaldson.png",
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
  },
  {
    name: "Daniel Murdoch",
    role: "Professional Technician",
    photo: "/images/team/daniel-murdoch.png",
  },
  {
    name: "Ethan Wildman",
    role: "Professional Technician",
    photo: "/images/team/ethan-wildman.png",
  },
] as const;

export const heritageBlurb =
  "For over 30 years, McKee Security has served families and businesses throughout the Haliburton region. Founded by Maurice McKee and now led by third-generation owner Brenden McKee, we have built our reputation on professional installation, honest service, and cutting-edge technology.";

export const images = {
  heroHome: "/images/hero-home.jpg",
  bannerDesktop: "/images/banner-desktop.png",
  bannerMobile: "/images/banner-mobile.png",
  browseServicesBg: "/images/browse-services-bg.jpg",
  hat: "/images/hat.png",
  teamInstall: "/images/team-install.jpg",
  sonosBg: "/images/sonos-bg.jpg",
  logo: "/images/logo.png",
  services: {
    securityWireless: "/images/services/security-wireless.jpg",
    securityWired: "/images/services/security-wired.jpg",
    securityFacilities: "/images/services/security-facilities.jpg",
    totalConnect: "/images/services/total-connect.png",
    cameras: "/images/services/cameras.png",
    networking: "/images/services/networking.png",
    tvInstall: "/images/services/tv-install.png",
    homeTheater: "/images/services/home-theater.png",
    starlink: "/images/services/starlink.jpg",
    preWire: "/images/services/pre-wire.jpg",
    honeywell: "/images/services/honeywell.jpg",
    starlinkMount: "/images/services/starlink-mount.jpg",
    starlinkCable: "/images/services/starlink-cable.jpg",
  },
} as const;
