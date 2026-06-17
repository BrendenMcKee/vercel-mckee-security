import type { Course } from "@/lib/courses";
import { iterLessons } from "@/lib/courses";

const STORAGE_KEY = "mckee-course-progress-v1";

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
  let completedLessons = 0;

  for (const { lesson, lessonId } of lessons) {
    const done = lesson.checklist.every(
      (_, index) => entry.checklist[checklistKey(lessonId, index)],
    );
    if (done && lesson.checklist.length > 0) completedLessons += 1;
  }

  const totalLessons = lessons.length;
  const percent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return {
    completedLessons,
    totalLessons,
    percent,
    celebrated: entry.celebrated ?? false,
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
}
