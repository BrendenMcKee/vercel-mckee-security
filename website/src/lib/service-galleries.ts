export type GalleryPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
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
      "Every panel is bench-built, programmed, and tested by our own technicians before it protects your home or business.",
    photos: [
      {
        src: `${WORK}/security-panel-build.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee technician assembling and programming a security panel at the workbench",
        caption: "Bench-building and programming a security panel",
      },
      {
        src: `${WORK}/security-panel-wiring.jpg`,
        width: 1600,
        height: 901,
        alt: "Technician wiring an alarm control panel",
        caption: "Wiring a control panel by hand",
      },
      {
        src: `${WORK}/security-keypad.jpg`,
        width: 1600,
        height: 901,
        alt: "Technician assembling an alarm keypad",
        caption: "Assembling and testing keypads",
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
        alt: "Wall-mounted multi-camera surveillance monitoring display",
        caption: "Live multi-camera monitoring walls",
      },
      {
        src: `${WORK}/camera-monitors-live.jpg`,
        width: 900,
        height: 1600,
        alt: "Dual monitors showing live camera feeds from a commercial gas station",
        caption: "Every camera on one wall",
      },
      {
        src: `${WORK}/camera-commercial-team.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee crew on a commercial gas station rooftop",
        caption: "A complete system for a busy gas station",
      },
      {
        src: `${WORK}/camera-centex-ladder-team.jpg`,
        width: 901,
        height: 1600,
        alt: "Three McKee technicians installing a ceiling camera from a ladder",
        caption: "Mounting cameras as a team",
      },
      {
        src: `${WORK}/camera-ceiling-install.jpg`,
        width: 1600,
        height: 901,
        alt: "McKee technician installing a ceiling camera at a commercial site",
        caption: "Interior camera installs",
      },
      {
        src: `${WORK}/camera-centex-exterior-install.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee crew installing an exterior building camera at a gas station",
        caption: "Exterior coverage for a commercial site",
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
        caption: "Staging Uniview UNV camera systems",
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
        src: `${WORK}/network-cat6-equipment-room.jpg`,
        width: 901,
        height: 1600,
        alt: "McKee team running Cat6 cabling in an equipment room",
        caption: "Structured cabling in the equipment room",
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
        width: 720,
        height: 1280,
        alt: "Technician mounting a Ubiquiti wireless bridge antenna on a rooftop",
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
    ],
  },
  "audio-video": {
    eyebrow: "On the Job",
    title: "Audio & Video That Lives Where You Do",
    intro:
      "Real installs from around the Haliburton lakes, from weatherproof outdoor TVs to whole-home systems we design with you.",
    photos: [
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
        src: `${WORK}/av-outdoor-tv-trees.jpg`,
        width: 901,
        height: 1600,
        alt: "Outdoor television mounted among the trees",
        caption: "Built for the backyard",
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
        width: 747,
        height: 1600,
        alt: "McKee technician mounting a Starlink dish from a ladder",
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
        width: 747,
        height: 1600,
        alt: "Technician installing a Starlink dish on a gable end",
        caption: "Gable-end installs that stay clear of the roof",
      },
      {
        src: `${WORK}/starlink-dock.jpg`,
        width: 901,
        height: 1600,
        alt: "Starlink dish mounted near a dock on the lake",
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
    ],
  },
};

export function getServiceGallery(slug: string) {
  return serviceGalleries[slug];
}
