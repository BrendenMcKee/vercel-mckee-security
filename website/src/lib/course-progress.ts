import type { Course } from "@/lib/courses";
import { iterLessons } from "@/lib/courses";

const STORAGE_KEY = "mckee-course-progress-v1";
const HTML_CHECK_PREFIX = "mckee-lesson-html-checks:";
const PENDING_LINK_PREFIX = "mckee-pending-link:";

type CourseProgressEntry = {
  checklist: Record<string, boolean>;
  celebrated?: boolean;
};

type ProgressStore = Record<string, CourseProgressEntry>;

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function checklistKey(lessonId: string, itemIndex: number) {
  return `${lessonId}:${itemIndex}`;
}

export function getCourseProgress(course: Course) {
  const store = readStore();
  const entry = store[course.slug] ?? { checklist: {} };
  const lessons = iterLessons(course);
  let totalItems = 0;
  let checkedItems = 0;
  let completedLessons = 0;

  for (const { lesson, lessonId } of lessons) {
    totalItems += lesson.checklist.length;
    let lessonChecked = 0;
    for (let index = 0; index < lesson.checklist.length; index++) {
      if (entry.checklist[checklistKey(lessonId, index)]) {
        checkedItems += 1;
        lessonChecked += 1;
      }
    }
    if (lessonChecked === lesson.checklist.length && lesson.checklist.length > 0) {
      completedLessons += 1;
    }
  }

  const percent =
    totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  return {
    checkedItems,
    totalItems,
    completedLessons,
    totalLessons: lessons.length,
    percent,
    celebrated: entry.celebrated ?? false,
  };
}

export function getLessonProgress(course: Course, lessonId: string) {
  const store = readStore();
  const entry = store[course.slug] ?? { checklist: {} };
  const lesson = iterLessons(course).find((l) => l.lessonId === lessonId)?.lesson;
  if (!lesson || lesson.checklist.length === 0) {
    return { checked: 0, total: 0, percent: 0 };
  }

  let checked = 0;
  for (let index = 0; index < lesson.checklist.length; index++) {
    if (entry.checklist[checklistKey(lessonId, index)]) checked += 1;
  }

  return {
    checked,
    total: lesson.checklist.length,
    percent: Math.round((checked / lesson.checklist.length) * 100),
  };
}

export function isChecklistItemComplete(
  courseSlug: string,
  lessonId: string,
  itemIndex: number,
) {
  const store = readStore();
  return store[courseSlug]?.checklist[checklistKey(lessonId, itemIndex)] ?? false;
}

export function isLessonComplete(course: Course, lessonId: string) {
  const lesson = iterLessons(course).find((l) => l.lessonId === lessonId)?.lesson;
  if (!lesson || lesson.checklist.length === 0) return false;
  return lesson.checklist.every((_, index) =>
    isChecklistItemComplete(course.slug, lessonId, index),
  );
}

export function completeChecklistItem(
  course: Course,
  lessonId: string,
  itemIndex: number,
) {
  if (itemIndex < 0) return getCourseProgress(course);
  if (isChecklistItemComplete(course.slug, lessonId, itemIndex)) {
    return getCourseProgress(course);
  }
  return toggleChecklistItem(course, lessonId, itemIndex, true);
}

export function toggleChecklistItem(
  course: Course,
  lessonId: string,
  itemIndex: number,
  value: boolean,
) {
  const store = readStore();
  const entry = store[course.slug] ?? { checklist: {} };
  entry.checklist[checklistKey(lessonId, itemIndex)] = value;
  store[course.slug] = entry;
  writeStore(store);
  return getCourseProgress(course);
}

export function markCourseCelebrated(courseSlug: string) {
  const store = readStore();
  const entry = store[courseSlug] ?? { checklist: {} };
  entry.celebrated = true;
  store[courseSlug] = entry;
  writeStore(store);
}

export function resetCourseProgress(courseSlug: string) {
  const store = readStore();
  delete store[courseSlug];
  writeStore(store);

  if (typeof window !== "undefined") {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(HTML_CHECK_PREFIX) || key.startsWith(PENDING_LINK_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

export function readEmbeddedChecklistState(lessonId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${HTML_CHECK_PREFIX}${lessonId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function writeEmbeddedChecklistState(
  lessonId: string,
  state: Record<string, boolean>,
) {
  localStorage.setItem(`${HTML_CHECK_PREFIX}${lessonId}`, JSON.stringify(state));
}

export function markExternalLinkPending(lessonId: string) {
  sessionStorage.setItem(`${PENDING_LINK_PREFIX}${lessonId}`, "1");
}

export function consumeExternalLinkPending(lessonId: string) {
  const key = `${PENDING_LINK_PREFIX}${lessonId}`;
  const pending = sessionStorage.getItem(key);
  if (pending) sessionStorage.removeItem(key);
  return Boolean(pending);
}
