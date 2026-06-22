export type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** object-position for the cropped thumbnail (defaults to center) */
  objectPosition?: string;
};

export type ServiceGalleryContent = {
  eyebrow: string;
  title: string;
  intro: string;
  photos: GalleryPhoto[];
};

const WORK = "/images/services/work";

export const serviceGalleries: Record<string, ServiceGalleryContent> = {
  security: {
    eyebrow: "On the Job",
    title: "Real Security Installs by Our Team",
    intro:
      "Real installs and ongoing training from technicians who know these systems inside and out.",
    photos: [
      {
        src: `${WORK}/security-panel-build.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee technician in advanced security panel training at the workbench",
        caption: "Advanced bench training to refine security skills",
      },
      {
        src: `${WORK}/security-board-tech.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee technician standing beside a wall-mounted security and equipment board",
        caption: "Building out the security equipment board",
        objectPosition: "50% 35%",
      },
      {
        src: `${WORK}/security-rough-in.jpg`,
        width: 901,
        height: 1600,
        alt: "Two McKee technicians running low-voltage wiring during a construction rough-in",
        caption: "Low-voltage rough-in during the build",
        objectPosition: "50% 30%",
      },
      {
        src: `${WORK}/security-panel-install.jpg`,
        width: 901,
        height: 1600,
        alt: "Alarm panel and smart hub installed on a wall",
        caption: "Clean panel and smart-hub installs",
      },
      {
        src: `${WORK}/security-yard-sign.jpg`,
        width: 901,
        height: 1600,
        alt: "Premises protected yard sign in front of a home",
        caption: "Monitored, protected, and clearly marked",
      },
      {
        src: `${WORK}/security-team-onsite.jpg`,
        width: 900,
        height: 1600,
        alt: "Two McKee Security technicians on a residential job site",
        caption: "Our technicians on site",
        objectPosition: "50% 78%",
      },
      {
        src: `${WORK}/security-alarm-bench-wiring.jpg`,
        width: 900,
        height: 1600,
        alt: "McKee technician wiring and programming an alarm panel on the workbench",
        caption: "Bench-wired and programmed before install",
      },
      {
        src: "/images/gallery/security-gear-lineup.jpg",
        width: 1600,
        height: 1067,
        alt: "Lineup of Yale and Honeywell security hardware including locks, sensors, panels, and keypads",
        caption: "The proven hardware we install",
      },
      {
        src: `${WORK}/security-alarm-package.jpg`,
        width: 1600,
        height: 1067,
        alt: "Complete Honeywell alarm package with panel, keypad, sensors, and siren on a table by the lake",
        caption: "A complete alarm package, ready to install",
      },
    ],
  },
  "camera-surveillance": {
    eyebrow: "On the Job",
    title: "From Cottages to Commercial Sites",
    intro:
      "From single-home setups to a full commercial system for a Centex gas station, our crew handles every camera, cable run, and monitor wall in-house.",
    photos: [
      {
        src: `${WORK}/camera-monitor-wall.jpg`,
        width: 900,
        height: 1600,
        alt: "Dual monitors showing live camera feeds from a commercial gas station",
        caption: "Every camera on one live monitoring wall",
      },
      {
        src: "/images/hero-apply-now.jpg",
        width: 2400,
        height: 1121,
        alt: "McKee workbench with a Dahua NVR, dome camera, and live monitoring software on screen",
        caption: "Programming and testing NVR systems at the bench",
        objectPosition: "8% 50%",
      },
      {
        src: `${WORK}/camera-commercial-team.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee crew on a commercial gas station rooftop",
        caption: "A complete system for a busy gas station",
      },
      {
        src: `${WORK}/camera-centex-camera-mount.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee crew mounting an exterior camera on a commercial building",
        caption: "Mounting exterior cameras as a team",
        objectPosition: "50% 35%",
      },
      {
        src: `${WORK}/camera-ceiling-install.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee technician installing a ceiling camera at a commercial site",
        caption: "Running interior ceiling cameras",
      },
      {
        src: `${WORK}/camera-centex-store-walk.jpg`,
        width: 901,
        height: 1600,
        alt: "Smiling McKee technician on a commercial camera install",
        caption: "On the job at a commercial build",
      },
      {
        src: `${WORK}/camera-uniview-staging.jpg`,
        width: 901,
        height: 1600,
        alt: "Technician unboxing and staging Uniview UNV cameras",
        caption: "Staging the Uniview camera system",
      },
      {
        src: `${WORK}/camera-pole-team-install.jpg`,
        width: 1536,
        height: 1024,
        alt: "Two McKee technicians on ladders mounting multi-sensor cameras on a lamp post",
        caption: "Pole-mounted cameras, installed as a team",
      },
      {
        src: `${WORK}/camera-centex-ceiling-harness.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee technicians in fall-arrest harnesses installing ceiling cameras at a commercial site",
        caption: "Ceiling camera installs, done safely",
      },
      {
        src: `${WORK}/camera-placement-consult.jpg`,
        width: 1600,
        height: 747,
        alt: "Technician reviewing live camera placement with a client on a portable monitor and tablet",
        caption: "Planning camera placement with you",
      },
      {
        src: `${WORK}/camera-gate-post.jpg`,
        width: 1600,
        height: 747,
        alt: "McKee technician installing a camera on a gate post at a property entrance",
        caption: "Cameras at the entrance gate",
      },
      {
        src: `${WORK}/camera-dome-ceiling.jpg`,
        width: 1600,
        height: 828,
        alt: "Close-up of a 4K Uniview dome camera mounted to a ceiling",
        caption: "The 4K dome cameras we install",
      },
    ],
  },
  "networking-cellular-expansion": {
    eyebrow: "On the Job",
    title: "Structured Cabling and Wireless, Done Right",
    intro:
      "Clean Cat6 runs, organized racks, and rooftop wireless bridges, planned and pulled by the same team that supports them.",
    photos: [
      {
        src: `${WORK}/network-multigen-cabling.jpg`,
        width: 901,
        height: 1600,
        alt: "Three generations of the McKee family pulling structured cabling together",
        caption: "Three generations, still on the tools",
      },
      {
        src: `${WORK}/network-cat6-termination.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee technician hand-terminating a Cat6 connector",
        caption: "Hand-terminated, tested connections",
      },
      {
        src: `${WORK}/network-centex-panel-cabling.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee technicians running structured cabling to a commercial electrical panel",
        caption: "Commercial cabling landed at the panel",
      },
      {
        src: `${WORK}/network-ubiquiti-bridge.jpg`,
        width: 1536,
        height: 1024,
        alt: "McKee technician in a hard hat and fall-arrest harness mounting a Ubiquiti wireless bridge antenna on a rooftop",
        caption: "Rooftop wireless bridges for property-wide coverage",
      },
      {
        src: `${WORK}/network-rack.jpg`,
        width: 901,
        height: 1600,
        alt: "Network rack with patch panel and UPS",
        caption: "Tidy racks, patch panels, and battery backup",
      },
      {
        src: `${WORK}/network-unifi-board.jpg`,
        width: 901,
        height: 1600,
        alt: "UniFi structured wiring distribution board",
        caption: "UniFi-powered distribution boards",
      },
      {
        src: `${WORK}/network-equipment-closet.jpg`,
        width: 1600,
        height: 901,
        alt: "Equipment closet with electrical panel, structured wiring, networking gear, and a camera monitor",
        caption: "Structured wiring and gear in one closet",
      },
      {
        src: `${WORK}/network-cable-pull-framing.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee technician pulling structured cabling through open wall framing",
        caption: "Cabling pulled during the rough-in",
      },
      {
        src: `${WORK}/network-staircase-rough-in.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee crew running low-voltage cabling up a staircase during construction",
        caption: "Floor-to-floor cabling at rough-in",
      },
      {
        src: `${WORK}/network-patch-panel-blue.jpg`,
        width: 747,
        height: 1600,
        alt: "Patch panel with neatly dressed, color-coded blue Cat6 cabling",
        caption: "Cleanly dressed patch panels",
      },
      {
        src: `${WORK}/network-data-jacks.jpg`,
        width: 747,
        height: 1600,
        alt: "Stainless faceplate of cleanly labeled Cat6 data jacks",
        caption: "Labeled, professional data jacks",
      },
      {
        src: `${WORK}/network-parking-garage-cable.jpg`,
        width: 900,
        height: 1600,
        alt: "McKee technicians running structured cabling across a commercial parking garage",
        caption: "Large-scale commercial cable runs",
      },
      {
        src: "/images/services/pre-wire-topaz.jpg",
        width: 1600,
        height: 1600,
        alt: "Structured-cabling backboard with neatly coiled wiring during a commercial rough-in",
        caption: "Pre-wired backboard, ready for anything",
      },
      {
        src: `${WORK}/network-unifi-ap.jpg`,
        width: 1600,
        height: 900,
        alt: "McKee technician holding up a UniFi access point next to its box",
        caption: "Enterprise UniFi wireless, ready to deploy",
      },
    ],
  },
  "audio-video": {
    eyebrow: "On the Job",
    title: "Audio & Video That Lives Where You Do",
    intro:
      "Real installs from around the Haliburton lakes, from weatherproof outdoor TVs to whole-home systems we design with you.",
    photos: [
      {
        src: `${WORK}/av-living-room-aquarium.jpg`,
        width: 1600,
        height: 1067,
        alt: "Living room with a wall-mounted TV and floor-standing speakers above an aquarium, installed by McKee",
        caption: "A whole-room TV and sound setup",
      },
      {
        src: "/images/sonos-bg.jpg",
        width: 1499,
        height: 860,
        alt: "Rack of Sonos amplifiers wired for whole-home audio",
        caption: "Whole-home audio, racked and wired",
      },
      {
        src: `${WORK}/av-outdoor-tv-lakeside.jpg`,
        width: 901,
        height: 1600,
        alt: "Outdoor television on a lakeside patio installed by McKee",
        caption: "Lakeside patio entertainment",
      },
      {
        src: `${WORK}/av-outdoor-tv-mount.jpg`,
        width: 901,
        height: 1600,
        alt: "Weatherproof outdoor TV wall mount at a cottage",
        caption: "Weatherproof outdoor TV mounting",
      },
      {
        src: `${WORK}/av-outdoor-tv-tennis.jpg`,
        width: 901,
        height: 1600,
        alt: "Outdoor TV showing a live broadcast",
        caption: "Game day, outdoors",
      },
      {
        src: `${WORK}/av-system-design.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee team designing an audio-video system on a laptop",
        caption: "Custom-designed for your space",
      },
    ],
  },
  starlink: {
    eyebrow: "On the Job",
    title: "Starlink, Installed for Cottage Country",
    intro:
      "Local installs across our lakes and back roads, mounted cleanly with no roof penetration so you get fast internet anywhere.",
    photos: [
      {
        src: `${WORK}/starlink-mounting.jpg`,
        width: 1536,
        height: 1024,
        alt: "McKee technician in a hard hat and fall-arrest harness mounting a Starlink dish from a ladder",
        caption: "Mounted by hand, no roof penetration",
      },
      {
        src: `${WORK}/starlink-lakefront-pole.jpg`,
        width: 901,
        height: 1600,
        alt: "Starlink dish on a pole mount at a lakefront property",
        caption: "Clear-sky pole mounts at the lakefront",
      },
      {
        src: `${WORK}/starlink-gable-install.jpg`,
        width: 1536,
        height: 1024,
        alt: "McKee technician in a hard hat and fall-arrest harness installing a Starlink dish at a gable end from a ladder",
        caption: "Gable-end installs that stay clear of the roof",
      },
      {
        src: `${WORK}/starlink-dock.jpg`,
        width: 900,
        height: 1522,
        alt: "Starlink dish mounted on a dock post overlooking the lake",
        caption: "Connectivity right down to the dock",
      },
      {
        src: `${WORK}/starlink-roof-peak.jpg`,
        width: 901,
        height: 1600,
        alt: "Starlink dish mounted at a roof peak",
        caption: "Optimal placement at the roof peak",
      },
      {
        src: `${WORK}/starlink-eave-modern.jpg`,
        width: 901,
        height: 1600,
        alt: "Starlink dish on a clean eave mount at a modern home",
        caption: "Clean eave mounts on modern homes",
      },
      {
        src: `${WORK}/starlink-dish-closeup.jpg`,
        width: 901,
        height: 1600,
        alt: "Close-up of a mounted Starlink dish on a low-profile bracket",
        caption: "A clean look at the mounted hardware",
      },
      {
        src: `${WORK}/starlink-snow-pole.jpg`,
        width: 1280,
        height: 850,
        alt: "Starlink dish on a pole mount standing above deep snow against a blue winter sky",
        caption: "Pole-mounted and clear through winter",
      },
    ],
  },
};

export function getServiceGallery(slug: string) {
  return serviceGalleries[slug];
}
