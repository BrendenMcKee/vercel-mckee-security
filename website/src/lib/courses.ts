export type CourseLesson = {
  title: string;
  duration?: string;
  checklist: string[];
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

function onlineChecklist(title: string): string[] {
  return [
    "Review all e-learning materials for this lesson",
    "Take notes on key steps, tools, and safety requirements",
    "Complete any review questions or knowledge checks",
    `Confirm you can explain the core concepts of: ${title}`,
  ];
}

function handsOnChecklist(title: string): string[] {
  return [
    "Gather tools, parts, and documentation before starting",
    `Complete the hands-on task: ${title}`,
    "Verify the installation or configuration with a supervisor",
    "Document issues, questions, or follow-up items",
  ];
}

function lesson(
  title: string,
  handsOn: boolean,
  duration?: string,
): CourseLesson {
  return {
    title,
    duration,
    checklist: handsOn ? handsOnChecklist(title) : onlineChecklist(title),
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
              lesson("Vista 20P Essentials", false, "0h 55m"),
              lesson("Vista 20P Setup, Programming, and Functionality", false, "2h 10m"),
            ],
          },
          {
            title: "Vista 20P Series (In-Person Training)",
            duration: "8h 0m",
            lessons: [
              lesson("Vista20P Installation: Wire the Panel and Devices", true),
              lesson("Vista20P Programming: Program Security System", true),
              lesson("Vista20P AlarmNet 360: Monitoring and Account Setup", true),
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
              lesson("Intro to ProSeries", false, "0h 25m"),
              lesson("ProSeries Applications", false, "0h 35m"),
            ],
          },
          {
            title: "ProSeries (In-Person Training)",
            duration: "6h 0m",
            lessons: [
              lesson("Installation: Wire the ProSeries Keypad and Gather Devices", true),
              lesson("AlarmNet 360 ProSeries: Monitoring and Account Setup", true),
              lesson("Programming ProSeries: Program Security System", true),
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
              lesson("E-Learning: NVR / Camera Installation and Device Setup", false),
            ],
          },
          {
            title: "Dahua (In-Person Training)",
            duration: "2h 0m",
            lessons: [
              lesson("Dahua Camera / NVR Installation", true),
              lesson("Dahua NVR Setup, Programming, and Configuration", true),
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
            lessons: [lesson("Learn the Essentials of Installing Starlink", false)],
          },
          {
            title: "Starlink (In-Person Training)",
            duration: "1h 30m",
            lessons: [lesson("Starlink Setup and Configuration", true)],
          },
        ],
      },
      {
        title: "Ubiquiti Network Administration",
        topics: [
          {
            title: "Ubiquiti (Online E-Learning)",
            duration: "1h 0m",
            lessons: [lesson("Learn the Basics of Network Administration", false)],
          },
          {
            title: "Ubiquiti (In-Person Training)",
            duration: "1h 30m",
            lessons: [lesson("Setup a Complete Wireless Network", true)],
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
