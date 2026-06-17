"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  PartyPopper,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Course } from "@/lib/courses";
import { iterLessons } from "@/lib/courses";
import { LessonContentPanel, hasLessonContent } from "@/components/courses/lesson-content";
import {
  getCourseProgress,
  getLessonProgress,
  isChecklistItemComplete,
  isLessonComplete,
  markCourseCelebrated,
  resetCourseProgress,
  toggleChecklistItem,
} from "@/lib/course-progress";
import { celebrateConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";
import "@/styles/course-lesson-content.css";

type OpenLesson = string | null;

export function CoursePlayer({ course }: { course: Course }) {
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [openLesson, setOpenLesson] = useState<OpenLesson>(null);
  const [progress, setProgress] = useState(() => getCourseProgress(course));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProgress(getCourseProgress(course));
  }, [course]);

  const handleToggleItem = (
    lessonId: string,
    itemIndex: number,
    checked: boolean,
  ) => {
    toggleChecklistItem(course, lessonId, itemIndex, checked);
    const next = getCourseProgress(course);
    setProgress(next);
    if (next.percent === 100 && next.totalItems > 0 && !next.celebrated) {
      markCourseCelebrated(course.slug);
      celebrateConfetti();
      setProgress({ ...next, celebrated: true });
    }
  };

  const handleReset = () => {
    resetCourseProgress(course.slug);
    setOpenLesson(null);
    setProgress(getCourseProgress(course));
  };

  const lessonEntries = useMemo(() => iterLessons(course), [course]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-surface-elevated/50 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Your Progress
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {mounted ? progress.percent : 0}% Complete
            </h3>
            <p className="mt-1 text-sm text-white/60">
              {mounted
                ? `${progress.checkedItems} of ${progress.totalItems} checklist steps done · ${progress.completedLessons} of ${progress.totalLessons} lessons finished`
                : "Loading saved progress..."}
            </p>
          </div>
          {mounted && progress.percent === 100 && (
            <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400">
              <Trophy className="h-4 w-4" />
              Course Complete
            </div>
          )}
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/40">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#e04545]"
            initial={false}
            animate={{ width: `${mounted ? progress.percent : 0}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOpenModule(openModule === null ? 0 : null)}
            className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-primary/40 hover:text-white"
          >
            {openModule === null ? "Expand first module" : "Toggle modules"}
          </button>
          {mounted && progress.percent > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-primary/40 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset progress
            </button>
          )}
        </div>
      </div>

      {mounted && progress.percent === 100 && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm text-white/85">
          <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
          Congratulations. You have completed every lesson checklist in this course.
        </div>
      )}

      <div className="space-y-4">
        {course.modules.map((mod, moduleIndex) => {
          const moduleLessons = lessonEntries.filter(
            (entry) => entry.moduleIndex === moduleIndex,
          );
          const moduleCompleted = moduleLessons.filter((entry) =>
            mounted ? isLessonComplete(course, entry.lessonId) : false,
          ).length;

          return (
            <div
              key={mod.title}
              className="overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/40"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenModule(openModule === moduleIndex ? null : moduleIndex)
                }
                className="flex w-full cursor-pointer items-center justify-between gap-4 p-6 text-left transition hover:bg-white/[0.02]"
              >
                <div>
                  <span className="text-lg font-bold text-white">{mod.title}</span>
                  {mounted && (
                    <p className="mt-1 text-xs text-white/45">
                      {moduleCompleted} / {moduleLessons.length} lessons complete
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-white/50 transition",
                    openModule === moduleIndex && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {openModule === moduleIndex && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5"
                  >
                    <div className="space-y-6 p-6 pt-2">
                      {mod.topics.map((topic, topicIndex) => {
                        const topicLessons = lessonEntries.filter(
                          (entry) =>
                            entry.moduleIndex === moduleIndex &&
                            entry.topicIndex === topicIndex,
                        );
                        const topicCompleted = topicLessons.filter((entry) =>
                          mounted ? isLessonComplete(course, entry.lessonId) : false,
                        ).length;

                        return (
                          <div key={topic.title}>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <h4 className="font-semibold text-white/90">{topic.title}</h4>
                              <div className="flex items-center gap-3 text-xs text-white/45">
                                {topic.duration && <span>{topic.duration}</span>}
                                {mounted && (
                                  <span>
                                    {topicCompleted}/{topicLessons.length} complete
                                  </span>
                                )}
                              </div>
                            </div>

                            <ul className="space-y-3">
                              {topic.lessons.map((lessonItem, lessonIndex) => {
                                const lessonId = `${course.slug}:${moduleIndex}:${topicIndex}:${lessonIndex}`;
                                const complete = mounted
                                  ? isLessonComplete(course, lessonId)
                                  : false;
                                const expanded = openLesson === lessonId;
                                const lessonProgress = mounted
                                  ? getLessonProgress(course, lessonId)
                                  : { checked: 0, total: 0, percent: 0 };
                                const hasContent = hasLessonContent(lessonId);

                                return (
                                  <li
                                    key={lessonId}
                                    className={cn(
                                      "overflow-hidden rounded-xl border transition",
                                      complete
                                        ? "border-green-500/30 bg-green-500/5"
                                        : "border-white/10 bg-black/20",
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenLesson(expanded ? null : lessonId)
                                      }
                                      className="flex w-full cursor-pointer items-start gap-3 p-4 text-left transition hover:bg-white/[0.03]"
                                    >
                                      {complete ? (
                                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                                      ) : (
                                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-white/30" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-medium text-white">
                                            {lessonItem.title}
                                          </p>
                                          {hasContent && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                              <BookOpen className="h-3 w-3" />
                                              Content
                                            </span>
                                          )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                                          {lessonItem.duration && (
                                            <span>{lessonItem.duration}</span>
                                          )}
                                          {mounted && lessonProgress.total > 0 && (
                                            <span>
                                              {lessonProgress.checked}/{lessonProgress.total}{" "}
                                              checklist steps
                                            </span>
                                          )}
                                        </div>
                                        {mounted && lessonProgress.total > 0 && (
                                          <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/40">
                                            <div
                                              className="h-full rounded-full bg-primary transition-all duration-300"
                                              style={{ width: `${lessonProgress.percent}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <ChevronDown
                                        className={cn(
                                          "mt-0.5 h-4 w-4 shrink-0 text-white/40 transition",
                                          expanded && "rotate-180",
                                        )}
                                      />
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {expanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="border-t border-white/5"
                                        >
                                          <div className="space-y-6 p-4 pt-4">
                                            <LessonContentPanel lessonId={lessonId} />

                                            <div className="space-y-2">
                                              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                                                Lesson Checklist
                                              </p>
                                              <p className="text-xs text-white/45">
                                                Each checked item updates your course progress
                                                immediately.
                                              </p>
                                              {lessonItem.checklist.map((item, itemIndex) => {
                                                const checked = mounted
                                                  ? isChecklistItemComplete(
                                                      course.slug,
                                                      lessonId,
                                                      itemIndex,
                                                    )
                                                  : false;

                                                return (
                                                  <label
                                                    key={item}
                                                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 transition hover:border-primary/30"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      onChange={(e) =>
                                                        handleToggleItem(
                                                          lessonId,
                                                          itemIndex,
                                                          e.target.checked,
                                                        )
                                                      }
                                                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                                                    />
                                                    <span
                                                      className={cn(
                                                        "text-sm leading-relaxed",
                                                        checked
                                                          ? "text-white/50 line-through"
                                                          : "text-white/80",
                                                      )}
                                                    >
                                                      {item}
                                                    </span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
