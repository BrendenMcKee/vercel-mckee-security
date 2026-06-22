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
    src: `${GAL}/gallery-hero-crew-truck.jpg`,
    width: 2000,
    height: 1126,
    category: "team",
    title: "Crew and Company Truck",
    description:
      "McKee Security technicians on site with the company truck. They are the team behind every install.",
  },
  {
    src: "/images/hero-home.jpg",
    width: 2400,
    height: 1351,
    category: "team",
    title: "Just Another Morning",
    description:
      "Talking through the day's installs between the trucks before heading out.",
  },
  {
    src: "/images/hero-crew-backs.jpg",
    width: 2400,
    height: 1600,
    category: "team",
    title: "Industry Professionals",
    description:
      "Our crew in McKee gear, ready to install security, cameras, networking, and more at your property.",
  },
  {
    src: "/images/browse-services-bg.jpg",
    width: 2560,
    height: 1707,
    category: "team",
    title: "Every Service, One Team",
    description:
      "Security, cameras, networking, audio and video, and Starlink are all installed by the same local crew.",
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
    title: "Advanced Security Training",
    description:
      "Hands-on bench training where our technicians sharpen programming and troubleshooting skills on real alarm equipment.",
  },
  {
    src: `${WORK}/security-alarm-package.jpg`,
    width: 1600,
    height: 1067,
    category: "security",
    title: "A Complete Alarm Package",
    description:
      "The full alarm system includes the panel, keypad, sensors, and siren, staged and ready to install.",
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
    src: `${WORK}/av-living-room-aquarium.jpg`,
    width: 1600,
    height: 1067,
    category: "audio-video",
    title: "Where the Living Room Comes Alive",
    description:
      "A wall-mounted TV and floor-standing speakers tuned to fill the whole room. Even the aquarium got a front-row seat.",
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
    src: `${WORK}/camera-dome-ceiling.jpg`,
    width: 1600,
    height: 828,
    category: "camera-surveillance",
    title: "Crystal-Clear 4K Cameras",
    description:
      "The 4K Uniview dome cameras we install capture sharp, detailed footage day and night.",
  },
  {
    src: "/images/hero-apply-now.jpg",
    width: 2400,
    height: 1121,
    category: "camera-surveillance",
    title: "Bench-Tested NVR Systems",
    description:
      "Programming Dahua recorders and dome cameras at the workbench before they go out to protect your property.",
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
    src: `${GAL}/team-shop-inventory.jpg`,
    width: 900,
    height: 1600,
    category: "team",
    title: "Stocked for Every Install",
    description:
      "Cat6, cameras, and surveillance gear staged in the shop before the crew heads out.",
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
    src: `${WORK}/network-unifi-ap.jpg`,
    width: 1600,
    height: 900,
    category: "networking",
    title: "Enterprise Wi-Fi, Unboxed",
    description:
      "Deploying UniFi access points for fast, seamless wireless coverage across the whole property.",
  },
  {
    src: "/images/services/pre-wire-topaz.jpg",
    width: 1600,
    height: 1600,
    category: "networking",
    title: "Pre-Wired for Anything",
    description:
      "A structured-cabling backboard roughed in during construction, ready for whatever the space needs.",
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
    src: "/images/sonos-bg.jpg",
    width: 1499,
    height: 860,
    category: "audio-video",
    title: "Whole-Home Audio, Racked",
    description:
      "Banks of Sonos amplifiers neatly wired to drive music into every room of the home.",
  },
  {
    src: `${WORK}/camera-centex-store-walk.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "A Local Crew On the Job",
    description:
      "Friendly, familiar technicians on site for a commercial camera install.",
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
    src: `${GAL}/security-gear-lineup.jpg`,
    width: 1600,
    height: 1067,
    category: "security",
    title: "Built on Proven Hardware",
    description:
      "The locks, sensors, panels, and keypads we trust to protect homes and businesses.",
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
    src: `${WORK}/starlink-snow-pole.jpg`,
    width: 1280,
    height: 850,
    category: "starlink",
    title: "Connected Through Winter",
    description:
      "A pole-mounted Starlink dish standing clear above the snow for reliable service all year.",
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
    src: "/images/hero-about.jpg",
    width: 2400,
    height: 1351,
    category: "team",
    title: "The Whole Crew",
    description:
      "The team that shows up. Local technicians who treat your property like their own.",
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
    src: "/images/hero-contact.jpg",
    width: 2400,
    height: 1351,
    category: "team",
    title: "Back at the Shop",
    description:
      "Planning jobs, programming systems, and talking shop around the table at HQ.",
  },
  {
    src: `${WORK}/network-ubiquiti-bridge.jpg`,
    width: 1536,
    height: 1024,
    category: "networking",
    title: "Rooftop Wireless Bridges",
    description:
      "A technician in a hard hat and harness mounts a Ubiquiti bridge on the rooftop. Point-to-point links extend a single network across multiple buildings and properties.",
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
  {
    src: `${GAL}/camera-pole-dome-install.jpg`,
    width: 1536,
    height: 1024,
    category: "camera-surveillance",
    title: "Multi-Sensor Coverage",
    description:
      "Mounting multi-sensor dome cameras high on a lamp post to cover an entire parking area.",
  },
  {
    src: `${GAL}/team-harness-drill.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Safety First, Every Climb",
    description:
      "Harnessed and tied off before heading up. Fall protection goes on every job at height.",
  },
  {
    src: `${WORK}/network-equipment-closet.jpg`,
    width: 1600,
    height: 901,
    category: "networking",
    title: "The Brains of the Build",
    description:
      "Structured wiring, networking, and camera monitoring centralized in one tidy equipment closet.",
  },
  {
    src: `${WORK}/starlink-dish-closeup.jpg`,
    width: 901,
    height: 1600,
    category: "starlink",
    title: "Dialed-In Hardware",
    description:
      "A clean look at a mounted Starlink dish and its low-profile bracket.",
  },
  {
    src: `${WORK}/camera-placement-consult.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Planned Around Your Property",
    description:
      "Walking a client through camera placement with a live demo before anything goes up.",
  },
  {
    src: `${GAL}/team-group-restaurant.jpg`,
    width: 1030,
    height: 1104,
    category: "team",
    title: "More Than Coworkers",
    description:
      "The crew off the clock. These are the people behind every install.",
  },
  {
    src: `${WORK}/network-cable-pull-framing.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Wired Before the Walls",
    description:
      "Structured cabling pulled through open framing during a new-build rough-in.",
  },
  {
    src: `${GAL}/camera-tree-driveway.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Watching the Driveway",
    description:
      "A discreet camera tucked into a tree, quietly covering a long estate driveway.",
  },
  {
    src: `${GAL}/team-shovel-portrait.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Whatever the Job Needs",
    description:
      "From trenching cable to mounting dishes, our crew handles it all.",
  },
  {
    src: `${WORK}/network-data-jacks.jpg`,
    width: 747,
    height: 1600,
    category: "networking",
    title: "Labeled to the Last Jack",
    description:
      "Clearly labeled data jacks make future moves, adds, and changes painless.",
  },
  {
    src: `${WORK}/security-alarm-bench-wiring.jpg`,
    width: 900,
    height: 1600,
    category: "security",
    title: "Wired on the Bench",
    description:
      "Alarm panels are wired and programmed on the bench before they ever reach your wall.",
  },
  {
    src: `${WORK}/camera-centex-ceiling-harness.jpg`,
    width: 1600,
    height: 901,
    category: "camera-surveillance",
    title: "Harnessed and Working Overhead",
    description:
      "Technicians in fall-arrest harnesses installing ceiling cameras at a commercial site.",
  },
  {
    src: `${GAL}/team-two-techs-rain.jpg`,
    width: 900,
    height: 1600,
    category: "team",
    title: "Rain or Shine",
    description:
      "Show up, suit up, and get it done in whatever weather we face.",
  },
  {
    src: `${WORK}/network-patch-panel-blue.jpg`,
    width: 747,
    height: 1600,
    category: "networking",
    title: "Color-Coded & Labeled",
    description:
      "A neatly dressed patch panel with color-coded Cat6 for easy maintenance.",
  },
  {
    src: `${WORK}/camera-gate-post.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Coverage at the Gate",
    description:
      "A camera on the gate post keeps watch over everyone who comes and goes.",
  },
  {
    src: `${GAL}/team-hard-hat-portrait.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Geared Up",
    description: "Hard hat on and ready for a day on the tools.",
  },
  {
    src: `${WORK}/network-parking-garage-cable.jpg`,
    width: 900,
    height: 1600,
    category: "networking",
    title: "Commercial Cable Runs",
    description:
      "Running structured cabling across a full commercial parking garage.",
  },
  {
    src: `${GAL}/av-luxury-prewire.jpg`,
    width: 747,
    height: 1600,
    category: "audio-video",
    title: "Wired From the Studs",
    description:
      "Pre-wiring a grand room for audio and video during a luxury new build.",
  },
  {
    src: `${WORK}/camera-pole-team-install.jpg`,
    width: 1536,
    height: 1024,
    category: "camera-surveillance",
    title: "A Two-Person Job",
    description:
      "Two technicians working together to mount cameras high on a parking-lot pole.",
  },
  {
    src: `${GAL}/team-harness-snow.jpg`,
    width: 747,
    height: 1600,
    category: "team",
    title: "Geared Up, Even in Winter",
    description:
      "Harnessed and ready for a cold-weather install. Safety gear stays on in every season.",
  },
  {
    src: `${GAL}/network-tower-snow.jpg`,
    width: 481,
    height: 1024,
    category: "networking",
    title: "Towers in the Snow",
    description:
      "Building out a wireless tower link in the middle of winter.",
  },
  {
    src: `${GAL}/camera-laptop-review.jpg`,
    width: 1600,
    height: 747,
    category: "camera-surveillance",
    title: "Tuned to Perfection",
    description:
      "Reviewing live camera feeds on site to dial in every angle.",
  },
  {
    src: `${GAL}/team-centex-harness-clipboard.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "Planning the Install",
    description:
      "The crew in fall-arrest harnesses reviewing the plan before heading up.",
  },
  {
    src: `${WORK}/network-staircase-rough-in.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Floor to Floor",
    description:
      "Running low-voltage cabling up the staircase during a construction rough-in.",
  },
  {
    src: `${GAL}/starlink-gable-real.jpg`,
    width: 1536,
    height: 1024,
    category: "starlink",
    title: "Gable-Mounted Starlink",
    description:
      "Installing a Starlink dish at the gable end, well clear of the roof surface.",
  },
  {
    src: `${GAL}/camera-centex-cable-drop.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "A Drop to Every Camera",
    description:
      "Ceiling cable drops feeding each camera location in a commercial store.",
  },
  {
    src: `${GAL}/team-crew-tool-bags.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "Game Plan",
    description: "Talking through the day's work before the tools come out.",
  },
  {
    src: `${GAL}/network-basement-wiring.jpg`,
    width: 900,
    height: 1600,
    category: "networking",
    title: "Tidy From the Start",
    description:
      "Network equipment mounted and wired cleanly in a mechanical room.",
  },
  {
    src: `${GAL}/camera-rooftop-ladder.jpg`,
    width: 1536,
    height: 1024,
    category: "camera-surveillance",
    title: "Eyes on Every Angle",
    description:
      "Mounting a rooftop camera to cover the approach to a property.",
  },
  {
    src: `${GAL}/team-respirator-portrait.jpg`,
    width: 747,
    height: 1600,
    category: "team",
    title: "The Dirty Work",
    description:
      "Respirator and headlamp on for the dusty, tight-space jobs others skip.",
  },
  {
    src: `${GAL}/network-tower-climb.jpg`,
    width: 1536,
    height: 1024,
    category: "networking",
    title: "Up the Tower",
    description:
      "Climbing an antenna tower to land a long-range wireless link.",
  },
  {
    src: `${GAL}/camera-centex-store-cooler.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Coverage Down Every Aisle",
    description:
      "Camera coverage planned right down to the cooler aisle of a busy store.",
  },
  {
    src: `${GAL}/team-harness-ascending.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "On the Way Up",
    description:
      "Tied off and climbing with fall protection in place before the work begins.",
  },
  {
    src: `${GAL}/network-antenna-roof-install.jpg`,
    width: 1536,
    height: 1024,
    category: "networking",
    title: "Up on the Roof",
    description:
      "Installing a rooftop antenna to extend coverage across a property.",
  },
  {
    src: `${GAL}/starlink-ladder-dish-house.jpg`,
    width: 901,
    height: 1600,
    category: "starlink",
    title: "Reaching the Roofline",
    description:
      "Ladders up to mount a satellite dish cleanly at the roofline.",
  },
  {
    src: `${GAL}/camera-portable-monitor.jpg`,
    width: 747,
    height: 1600,
    category: "camera-surveillance",
    title: "A Demo You Can See",
    description:
      "Our portable monitor lets clients see the camera system live before it's installed.",
  },
  {
    src: `${GAL}/team-centex-harness-portrait.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Suited Up",
    description:
      "A technician in full fall-arrest harness before climbing on a commercial site.",
  },
  {
    src: `${GAL}/network-roof-cable-route.jpg`,
    width: 1536,
    height: 1024,
    category: "networking",
    title: "Clean Runs, Even Up High",
    description: "Routing antenna cable neatly along the roofline.",
  },
  {
    src: `${GAL}/camera-centex-ceiling-cable.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Running Cable Overhead",
    description:
      "Pulling camera cable through the ceiling at a busy commercial site.",
  },
  {
    src: `${GAL}/team-shop-enclosure-build.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Built in the Shop",
    description: "Fabricating a custom equipment enclosure back at the shop.",
  },
  {
    src: `${GAL}/network-panel-antenna-mast.jpg`,
    width: 1536,
    height: 1024,
    category: "networking",
    title: "Cellular Where There Was None",
    description:
      "Mounting a panel antenna on a rooftop mast to boost cellular signal.",
  },
  {
    src: `${GAL}/camera-wood-post.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Mounted Where It Matters",
    description:
      "Fixing a camera to a wood post to cover an entry to the property.",
  },
  {
    src: `${GAL}/team-two-techs-framing.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "The A-Team",
    description: "Two of our technicians at a new-build rough-in.",
  },
  {
    src: `${GAL}/network-trench-splice.jpg`,
    width: 901,
    height: 1600,
    category: "networking",
    title: "Underground & Buried",
    description:
      "Splicing and burying cable in a trench for a clean, protected run.",
  },
  {
    src: `${GAL}/camera-centex-store-cabling.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Cabling the Store",
    description:
      "Running camera cabling through a commercial store during a full-system install.",
  },
  {
    src: `${GAL}/team-centex-harness-truck.jpg`,
    width: 1600,
    height: 901,
    category: "team",
    title: "On Site, Suited Up",
    description:
      "Arriving on a commercial job in fall protection, ready to get to work.",
  },
  {
    src: `${GAL}/camera-eave-mount-winter.jpg`,
    width: 901,
    height: 1600,
    category: "camera-surveillance",
    title: "Year-Round Installs",
    description:
      "Drilling an exterior eave mount in the dead of winter. We install in any season.",
  },
  {
    src: `${GAL}/team-crew-break-jobsite.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "A Quick Breather",
    description: "Taking a break at a new-build before getting back to it.",
  },
  {
    src: `${GAL}/team-shop-hardware-bins.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Every Part in Its Place",
    description:
      "Sorting hardware in the shop so nothing slows down the install.",
  },
  {
    src: `${GAL}/team-gable-ladders-setup.jpg`,
    width: 901,
    height: 1600,
    category: "team",
    title: "Ladders Up",
    description:
      "Staging ladders and fall-arrest gear for a gable-end install.",
  },
];
