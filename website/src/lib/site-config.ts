export const siteConfig = {
  name: "McKee Security & Audio Systems",
  tagline: "A viable technology solution",
  description:
    "Custom security, camera surveillance, networking, audio and video, and Starlink installation for homes and businesses in Haliburton, Ontario.",
  url: "https://mckeesecurity.ca",
  foundedYear: 1994,
  yearsInBusiness: 30,
  region: "Haliburton region, Ontario, Canada",
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

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
};

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "About Us", href: "/about-us" },
  {
    label: "Our Services",
    href: "/custom-installations-professional-products",
  },
  { label: "Security", href: "/security" },
  { label: "Camera Surveillance", href: "/camera-surveillance" },
  {
    label: "Networking / Cellular Expansion",
    href: "/networking-cellular-expansion",
  },
  { label: "Audio / Video", href: "/audio-video" },
  { label: "Starlink", href: "/starlink" },
];

export const footerNav: NavItem[] = [
  { label: "Our Courses", href: "/our-courses" },
  { label: "Apply Now", href: "/apply-now" },
  { label: "Terms and Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

export const team = [
  { name: "Maurice & Mary McKee", role: "Founders" },
  { name: "Brenden McKee", role: "Owner-Operator, Technical Director" },
  { name: "Dennis McKee", role: "Co-Owner" },
  { name: "Brenda McKee", role: "Co-Owner" },
  { name: "Andi Donaldson", role: "Administrative Manager" },
  { name: "Austin Reeve", role: "Master Technician, Networking Specialist" },
  { name: "Talon Dakin", role: "Master Technician, Training Specialist" },
  { name: "Daniel Murdoch", role: "Professional Technician" },
  { name: "Ethan Wildman", role: "Professional Technician" },
] as const;

export const heritageBlurb =
  "For over 30 years, McKee Security has served families and businesses throughout the Haliburton region. Founded by Maurice McKee and now led by third-generation owner Brenden McKee, we have built our reputation on professional installation, honest service, and cutting-edge technology.";
