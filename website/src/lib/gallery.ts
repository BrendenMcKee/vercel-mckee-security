export type GalleryCategoryId =
  | "security"
  | "camera-surveillance"
  | "networking"
  | "audio-video"
  | "starlink"
  | "team";

export type GalleryCategory = {
  id: GalleryCategoryId;
  label: string;
  /** Vivid hex used for the color-coded tag + active filter pill */
  color: string;
  /** Where the tag links in the lightbox */
  href: string;
};

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  category: GalleryCategoryId;
  title: string;
  description: string;
};

export const galleryCategories: GalleryCategory[] = [
  { id: "security", label: "Security", color: "#ef4444", href: "/security" },
  { id: "camera-surveillance", label: "Cameras", color: "#3b82f6", href: "/camera-surveillance" },
  { id: "networking", label: "Networking", color: "#10b981", href: "/networking-cellular-expansion" },
  { id: "audio-video", label: "Audio / Video", color: "#a855f7", href: "/audio-video" },
  { id: "starlink", label: "Starlink", color: "#f59e0b", href: "/starlink" },
  { id: "team", label: "Our Team", color: "#06b6d4", href: "/about-us" },
];

export const galleryCategoryMap: Record<GalleryCategoryId, GalleryCategory> =
  Object.fromEntries(galleryCategories.map((c) => [c.id, c])) as Record<
    GalleryCategoryId,
    GalleryCategory
  >;

const WORK = "/images/services/work";
const GAL = "/images/gallery";

// Curated, de-duplicated best-of set, ordered to interleave categories and
// aspect ratios for a lively mosaic in the "All" view.
export const galleryImages: GalleryImage[] = [
  {
    src: `${GAL}/team-crew-trucks.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "Team McKee",
    description:
      "A local crew that has served families and businesses across the Haliburton region since 1994.",
  },
  {
    src: `${GAL}/starlink-dock-red-chairs.jpg`,
    width: 901,
    height: 1600,
    category: "starlink",
    title: "Connected Cottage Country",
    description:
      "High-speed satellite internet reaching all the way to the end of the dock, where traditional service can't go.",
  },
  {
    src: `${WORK}/camera-commercial-team.jpg`,
    width: 1600,
    height: 901,
    category: "camera-surveillance",
    title: "A Full System for a Gas Station",
    description:
      "Our crew designed and installed a complete surveillance system for a busy Centex commercial site.",
  },
  {
    src: `${WORK}/security-panel-build.jpg`,
    width: 1600,
    height: 901,
    category: "security",
    title: "Bench-Built Security Panels",
    description:
      "Every alarm panel is assembled, programmed, and tested on our bench before it protects your property.",
  },
  {
    src: `${GAL}/network-utility-pole-climb.jpg`,
    width: 900,
    height: 1600,
    category: "networking",
    title: "Whatever It Takes",
    description:
      "Climbing a utility pole to land a clean wireless link exactly where it's needed.",
  },
  {
    src: `${WORK}/network-multigen-cabling.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Three Generations On the Job",
    description:
      "Family-run since 1994 and still hands-on, pulling structured cabling together.",
  },
  {
    src: `${WORK}/av-outdoor-tv-lakeside.jpg`,
    width: 901,
    height: 1600,
    category: "audio-video",
    title: "Lakeside Entertainment",
    description:
      "Weatherproof outdoor televisions built to live on the patio, right by the water.",
  },
  {
    src: `${GAL}/camera-arena-scissor-lift.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Arena-Scale Installs",
    description:
      "Mounting cameras from a lift to cover an entire community ice rink, end to end.",
  },
  {
    src: `${WORK}/starlink-mounting.jpg`,
    width: 1536,
    height: 1024,
    category: "starlink",
    title: "Mounted by Hand",
    description:
      "Professional Starlink installations with clean cable runs and no roof penetration.",
  },
  {
    src: `${WORK}/security-team-onsite.jpg`,
    width: 900,
    height: 1600,
    category: "security",
    title: "Our Technicians On Site",
    description:
      "A familiar local crew shows up, installs cleanly, and walks you through your new system.",
  },
  {
    src: `${WORK}/network-cat6-termination.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Hand-Terminated Connections",
    description:
      "Every Cat6 run is terminated and tested by hand for a fast, reliable connection.",
  },
  {
    src: `${WORK}/camera-monitor-wall.jpg`,
    width: 900,
    height: 1600,
    category: "camera-surveillance",
    title: "Live Monitoring Walls",
    description:
      "Multi-camera displays that put every angle of a property on a single screen.",
  },
  {
    src: `${WORK}/av-system-design.jpg`,
    width: 1600,
    height: 901,
    category: "audio-video",
    title: "Designed Around You",
    description:
      "We design each audio-video system to fit how you actually live in and use your space.",
  },
  {
    src: `${GAL}/starlink-lake-panorama.jpg`,
    width: 901,
    height: 1600,
    category: "starlink",
    title: "Anywhere on the Lake",
    description:
      "Starlink brings broadband to lakefront and rural properties traditional providers can't reach.",
  },
  {
    src: `${GAL}/network-server-rack.jpg`,
    width: 747,
    height: 1600,
    category: "networking",
    title: "Server Rooms, Sorted",
    description:
      "Color-coded cabling and clean terminations keep a live server rack easy to maintain.",
  },
  {
    src: `${WORK}/security-keypad.jpg`,
    width: 1600,
    height: 901,
    category: "security",
    title: "Keypads, Configured & Tested",
    description:
      "We assemble and verify every keypad so it's ready to arm the day we hand it over.",
  },
  {
    src: `${WORK}/camera-ceiling-install.jpg`,
    width: 1600,
    height: 901,
    category: "camera-surveillance",
    title: "Interior Camera Installs",
    description:
      "Discreet, carefully aimed interior cameras deliver complete indoor coverage.",
  },
  {
    src: `${WORK}/starlink-lakefront-pole.jpg`,
    width: 901,
    height: 1600,
    category: "starlink",
    title: "Clear-Sky Pole Mounts",
    description:
      "Pole mounts position the dish for an unobstructed view of the sky and a stronger signal.",
  },
  {
    src: `${GAL}/team-office-planning.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "Planning Every Project",
    description:
      "Jobs are scoped and planned in the shop before we ever arrive on site.",
  },
  {
    src: `${GAL}/team-construction-house.jpg`,
    width: 900,
    height: 1600,
    category: "team",
    title: "The Crew On Site",
    description:
      "Our technicians at a lakeside new-build, ready to wire it from the ground up.",
  },
  {
    src: `${WORK}/network-ubiquiti-bridge.jpg`,
    width: 720,
    height: 1280,
    category: "networking",
    title: "Rooftop Wireless Bridges",
    description:
      "Point-to-point links extend a single network across multiple buildings and properties.",
  },
  {
    src: `${GAL}/camera-bullet-tree.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Discreet Residential Coverage",
    description:
      "Cameras blended into the property to quietly watch over cottages and homes.",
  },
  {
    src: `${WORK}/camera-centex-camera-mount.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Mounting Cameras as a Team",
    description:
      "Lining up and mounting exterior cameras together on a commercial build.",
  },
  {
    src: `${GAL}/security-equipment-board.jpg`,
    width: 901,
    height: 1600,
    category: "security",
    title: "Pre-Built Equipment Boards",
    description:
      "Hubs, panels, and power are organized on a board before installation for a tidy finish.",
  },
  {
    src: `${WORK}/starlink-gable-install.jpg`,
    width: 1536,
    height: 1024,
    category: "starlink",
    title: "Gable-End Installs",
    description:
      "Dishes mounted to fascia and gable ends, keeping your roof completely intact.",
  },
  {
    src: `${WORK}/camera-exterior-install.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Commercial Exterior Coverage",
    description:
      "Weather-rated cameras positioned for complete perimeter coverage of a commercial site.",
  },
  {
    src: `${WORK}/network-unifi-board.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "UniFi Distribution",
    description:
      "Enterprise-grade UniFi equipment powering reliable, whole-property coverage.",
  },
  {
    src: `${WORK}/security-panel-wiring.jpg`,
    width: 1600,
    height: 901,
    category: "security",
    title: "Wired by Hand",
    description:
      "Clean, labeled wiring on every control panel makes for reliable, serviceable systems.",
  },
  {
    src: `${WORK}/starlink-dock.jpg`,
    width: 900,
    height: 1522,
    category: "starlink",
    title: "Internet Down to the Dock",
    description:
      "Fast, reliable connectivity that reaches every corner of the property.",
  },
  {
    src: `${WORK}/camera-uniview-staging.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Staging the System",
    description:
      "Cameras and recorders are staged and configured in the shop before they go up.",
  },
  {
    src: `${GAL}/network-airmax-antenna.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Long-Range Connectivity",
    description:
      "Rooftop airMAX antennas bridge the distance between separate sites.",
  },
  {
    src: `${WORK}/network-centex-panel-cabling.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Cabling to the Panel",
    description:
      "Clean structured-cabling runs landed neatly at the commercial electrical panel.",
  },
  {
    src: `${GAL}/team-truck-airfield.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "On the Road",
    description:
      "Our branded fleet covers the lakes and back roads across the region.",
  },
  {
    src: `${GAL}/security-circuit-board.jpg`,
    width: 747,
    height: 1600,
    category: "security",
    title: "Down to the Last Connection",
    description:
      "Attention to detail inside the panel is what keeps a system running for years.",
  },
  {
    src: `${GAL}/camera-nvr-display.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Recorded & Reviewable",
    description:
      "Multi-channel NVRs capture every feed, so the footage is there when you need it.",
  },
  {
    src: `${WORK}/security-yard-sign.jpg`,
    width: 901,
    height: 1600,
    category: "security",
    title: "Monitored & Protected",
    description:
      "ULC-listed monitoring backs every install, clearly marked to deter intruders.",
  },
];
