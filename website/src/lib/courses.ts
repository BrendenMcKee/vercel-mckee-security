export type CourseLesson = {
  title: string;
  duration?: string;
};

export type CourseTopic = {
  title: string;
  duration?: string;
  lessons: CourseLesson[];
};

export type CourseModule = {
  title: string;
  topics: CourseTopic[];
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  href: string;
  price: string;
  modules: CourseModule[];
};

export const courses: Course[] = [
  {
    slug: "mckee-security-technician",
    title: "McKee Security Technician Course",
    description:
      "Mastering technology and building confidence for the technicians of tomorrow. Free training covering security, cameras, Starlink, and networking.",
    href: "/courses/mckee-security-technician",
    price: "Free",
    modules: [
      {
        title: "Vista 20P Security System",
        topics: [
          {
            title: "Vista 20P Series (Online E-Learning)",
            duration: "3h 5m",
            lessons: [
              { title: "Vista 20P Essentials", duration: "0h 55m" },
              {
                title: "Vista 20P Setup, Programming, and Functionality",
                duration: "2h 10m",
              },
            ],
          },
          {
            title: "Vista 20P Series (In-Person Training)",
            duration: "8h 0m",
            lessons: [
              { title: "Vista20P Installation: Wire the Panel and Devices" },
              { title: "Vista20P Programming: Program Security System" },
              { title: "Vista20P AlarmNet 360: Monitoring and Account Setup" },
            ],
          },
        ],
      },
      {
        title: "ProSeries Security System",
        topics: [
          {
            title: "ProSeries (Online E-Learning)",
            duration: "1h 00m",
            lessons: [
              { title: "Intro to ProSeries", duration: "0h 25m" },
              { title: "ProSeries Applications", duration: "0h 35m" },
            ],
          },
          {
            title: "ProSeries (In-Person Training)",
            duration: "6h 0m",
            lessons: [
              {
                title:
                  "Installation: Wire the ProSeries Keypad and Gather Devices",
              },
              {
                title: "AlarmNet 360 ProSeries: Monitoring and Account Setup",
              },
              { title: "Programming ProSeries: Program Security System" },
            ],
          },
        ],
      },
      {
        title: "Dahua Camera Surveillance System",
        topics: [
          {
            title: "Dahua (Online E-Learning)",
            duration: "0h 30m",
            lessons: [
              {
                title:
                  "E-Learning: NVR / Camera Installation and Device Setup",
              },
            ],
          },
          {
            title: "Dahua (In-Person Training)",
            duration: "2h 0m",
            lessons: [
              { title: "Dahua Camera / NVR Installation" },
              { title: "Dahua NVR Setup, Programming, and Configuration" },
            ],
          },
        ],
      },
      {
        title: "Starlink Internet",
        topics: [
          {
            title: "Starlink (Online E-Learning)",
            duration: "1h 0m",
            lessons: [
              { title: "Learn the Essentials of Installing Starlink" },
            ],
          },
          {
            title: "Starlink (In-Person Training)",
            duration: "1h 30m",
            lessons: [{ title: "Starlink Setup and Configuration" }],
          },
        ],
      },
      {
        title: "Ubiquiti Network Administration",
        topics: [
          {
            title: "Ubiquiti (Online E-Learning)",
            duration: "1h 0m",
            lessons: [
              { title: "Learn the Basics of Network Administration" },
            ],
          },
          {
            title: "Ubiquiti (In-Person Training)",
            duration: "1h 30m",
            lessons: [{ title: "Setup a Complete Wireless Network" }],
          },
        ],
      },
    ],
  },
];

export function getCourseBySlug(slug: string) {
  return courses.find((c) => c.slug === slug);
}
