export type LessonChecklistItem = {
  label: string;
  /** Auto-check when trainee opens an external training link and returns to this tab */
  autoCompleteOnExternalLink?: boolean;
  /** Auto-check when every step in the embedded lesson checklist is done */
  autoCompleteOnEmbeddedSteps?: boolean;
};

export type CourseLesson = {
  title: string;
  duration?: string;
  checklist: LessonChecklistItem[];
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

function onlineLesson(
  title: string,
  duration: string | undefined,
  academyLabel: string,
): CourseLesson {
  return {
    title,
    duration,
    checklist: [
      {
        label: `Open the ${academyLabel} training link (opens in a new tab)`,
        autoCompleteOnExternalLink: true,
      },
      {
        label: `Finish the full ${academyLabel} e-learning module`,
      },
      {
        label: "Return here and confirm you completed the external training",
      },
    ],
  };
}

function handsOnLesson(
  title: string,
  duration: string | undefined,
  taskSummary: string,
): CourseLesson {
  return {
    title,
    duration,
    checklist: [
      {
        label: "Complete every step in the hands-on checklist above",
        autoCompleteOnEmbeddedSteps: true,
      },
      {
        label: taskSummary,
      },
      {
        label: "Supervisor verified the install, programming, or configuration",
      },
    ],
  };
}

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
              onlineLesson(
                "Vista 20P Essentials",
                "0h 55m",
                "Honeywell Academy Vista-20P Series Essentials",
              ),
              onlineLesson(
                "Vista 20P Setup, Programming, and Functionality",
                "2h 10m",
                "Honeywell Academy Vista-20P programming",
              ),
            ],
          },
          {
            title: "Vista 20P Series (In-Person Training)",
            duration: "8h 0m",
            lessons: [
              handsOnLesson(
                "Vista20P Installation: Wire the Panel and Devices",
                undefined,
                "Panel, keypad, and devices wired, labeled, and tested",
              ),
              handsOnLesson(
                "Vista20P Programming: Program Security System",
                undefined,
                "Zones, users, and system options programmed per McKee standards",
              ),
              handsOnLesson(
                "Vista20P AlarmNet 360: Monitoring and Account Setup",
                undefined,
                "AlarmNet 360 account active and central station signals verified",
              ),
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
              onlineLesson(
                "Intro to ProSeries",
                "0h 25m",
                "Honeywell ProSeries introduction",
              ),
              onlineLesson(
                "ProSeries Applications",
                "0h 35m",
                "Honeywell ProSeries applications",
              ),
            ],
          },
          {
            title: "ProSeries (In-Person Training)",
            duration: "6h 0m",
            lessons: [
              handsOnLesson(
                "Installation: Wire the ProSeries Keypad and Gather Devices",
                undefined,
                "ProSeries keypad and devices installed and wired correctly",
              ),
              handsOnLesson(
                "AlarmNet 360 ProSeries: Monitoring and Account Setup",
                undefined,
                "ProSeries monitoring account created and communicating",
              ),
              handsOnLesson(
                "Programming ProSeries: Program Security System",
                undefined,
                "ProSeries panel programmed and walk-tested successfully",
              ),
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
                title: "E-Learning: NVR / Camera Installation and Device Setup",
                duration: undefined,
                checklist: [
                  {
                    label: "Watch the Dahua NVR and camera setup video in the lesson",
                  },
                  {
                    label: "Review camera mounting, cabling, and NVR network setup steps",
                  },
                  {
                    label: "Confirm you can explain Dahua device commissioning basics",
                  },
                ],
              },
            ],
          },
          {
            title: "Dahua (In-Person Training)",
            duration: "2h 0m",
            lessons: [
              handsOnLesson(
                "Dahua Camera / NVR Installation",
                undefined,
                "Cameras mounted, cabled, and NVR rack/install completed",
              ),
              handsOnLesson(
                "Dahua NVR Setup, Programming, and Configuration",
                undefined,
                "NVR configured, recording verified, and customer demo completed",
              ),
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
              {
                title: "Learn the Essentials of Installing Starlink",
                duration: undefined,
                checklist: [
                  {
                    label: "Watch the Starlink installation video in the lesson",
                  },
                  {
                    label: "Review mounting, cabling, and app setup sections",
                  },
                  {
                    label: "Confirm you understand obstruction checks and alignment basics",
                  },
                ],
              },
            ],
          },
          {
            title: "Starlink (In-Person Training)",
            duration: "1h 30m",
            lessons: [
              handsOnLesson(
                "Starlink Setup and Configuration",
                undefined,
                "Dish aligned, router configured, and speed test documented",
              ),
            ],
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
              {
                title: "Learn the Basics of Network Administration",
                duration: undefined,
                checklist: [
                  {
                    label: "Review the UniFi network administration guide in the lesson",
                  },
                  {
                    label: "Study VLAN, SSID, and firewall concepts covered in the material",
                  },
                  {
                    label: "Confirm you can explain basic UniFi controller workflows",
                  },
                ],
              },
            ],
          },
          {
            title: "Ubiquiti (In-Person Training)",
            duration: "1h 30m",
            lessons: [
              handsOnLesson(
                "Setup a Complete Wireless Network",
                undefined,
                "UniFi network adopted, SSIDs live, and coverage validated on site",
              ),
            ],
          },
        ],
      },
    ],
  },
];

export function getCourseBySlug(slug: string) {
  return courses.find((c) => c.slug === slug);
}

export function getLessonId(
  courseSlug: string,
  moduleIndex: number,
  topicIndex: number,
  lessonIndex: number,
) {
  return `${courseSlug}:${moduleIndex}:${topicIndex}:${lessonIndex}`;
}

export function iterLessons(course: Course) {
  const items: {
    moduleIndex: number;
    topicIndex: number;
    lessonIndex: number;
    lesson: CourseLesson;
    lessonId: string;
  }[] = [];

  course.modules.forEach((mod, moduleIndex) => {
    mod.topics.forEach((topic, topicIndex) => {
      topic.lessons.forEach((lessonItem, lessonIndex) => {
        items.push({
          moduleIndex,
          topicIndex,
          lessonIndex,
          lesson: lessonItem,
          lessonId: getLessonId(course.slug, moduleIndex, topicIndex, lessonIndex),
        });
      });
    });
  });

  return items;
}

export function countLessons(course: Course) {
  return iterLessons(course).length;
}

export function findAutoLinkChecklistIndex(lesson: CourseLesson) {
  return lesson.checklist.findIndex((item) => item.autoCompleteOnExternalLink);
}

export function findEmbeddedSyncChecklistIndex(lesson: CourseLesson) {
  return lesson.checklist.findIndex((item) => item.autoCompleteOnEmbeddedSteps);
}
