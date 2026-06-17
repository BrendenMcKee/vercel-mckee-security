"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  PartyPopper,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Course } from "@/lib/courses";
import {
  findAutoLinkChecklistIndex,
  findEmbeddedSyncChecklistIndex,
  iterLessons,
} from "@/lib/courses";
import {
  ChecklistHint,
  getLessonHtml,
  LessonContentPanel,
  hasLessonContent,
} from "@/components/courses/lesson-content";
import {
  completeChecklistItem,
  consumeExternalLinkPending,
  getCourseProgress,
  getLessonProgress,
  isChecklistItemComplete,
  isLessonComplete,
  markCourseCelebrated,
  resetCourseProgress,
  toggleChecklistItem,
} from "@/lib/course-progress";
import { getEmbeddedCheckboxProgress } from "@/lib/lesson-html";
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

  const applyProgress = useCallback(
    (next: ReturnType<typeof getCourseProgress>) => {
      setProgress(next);
      if (next.percent === 100 && next.totalItems > 0 && !next.celebrated) {
        markCourseCelebrated(course.slug);
        celebrateConfetti();
        setProgress({ ...next, celebrated: true });
      }
    },
    [course.slug],
  );

  const handleToggleItem = useCallback(
    (lessonId: string, itemIndex: number, checked: boolean) => {
      applyProgress(toggleChecklistItem(course, lessonId, itemIndex, checked));
    },
    [applyProgress, course],
  );

  const tryAutoComplete = useCallback(
    (lessonId: string) => {
      const entry = iterLessons(course).find((l) => l.lessonId === lessonId);
      if (!entry) return;

      let next = getCourseProgress(course);

      const linkIndex = findAutoLinkChecklistIndex(entry.lesson);
      if (linkIndex >= 0 && consumeExternalLinkPending(lessonId)) {
        next = completeChecklistItem(course, lessonId, linkIndex);
      }

      const embeddedIndex = findEmbeddedSyncChecklistIndex(entry.lesson);
      if (embeddedIndex >= 0) {
        const html = getLessonHtml(lessonId);
        const embedded = getEmbeddedCheckboxProgress(lessonId, html);
        if (
          embedded.total > 0 &&
          embedded.checked >= embedded.total &&
          !isChecklistItemComplete(course.slug, lessonId, embeddedIndex)
        ) {
          next = completeChecklistItem(course, lessonId, embeddedIndex);
        }
      }

      applyProgress(next);
    },
    [applyProgress, course],
  );

  useEffect(() => {
    if (!openLesson) return;

    const onFocus = () => tryAutoComplete(openLesson);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [openLesson, tryAutoComplete]);

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
                ? `${progress.checkedItems} of ${progress.totalItems} steps done · ${progress.completedLessons} of ${progress.totalLessons} lessons finished`
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
          Congratulations. You have completed every lesson in this course.
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
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
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
                                        : "border-white/10 bg-black/25",
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
                                              Lesson
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
                                              steps
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
                                          className="border-t border-white/5 bg-black/15"
                                        >
                                          <div className="space-y-5 p-4 md:p-5">
                                            {hasContent && (
                                              <div>
                                                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
                                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                  Training Material
                                                </p>
                                                <LessonContentPanel
                                                  lessonId={lessonId}
                                                  onEmbeddedProgressChange={() =>
                                                    tryAutoComplete(lessonId)
                                                  }
                                                />
                                              </div>
                                            )}

                                            <div className="rounded-xl border border-white/10 bg-surface/80 p-4 md:p-5">
                                              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                                                <ClipboardCheck className="h-3.5 w-3.5" />
                                                Lesson Progress
                                              </p>
                                              <p className="mt-1 text-left text-xs leading-relaxed text-white/45">
                                                Check off each milestone below. Some steps
                                                complete automatically when you finish hands-on
                                                tasks or return from external training links.
                                              </p>

                                              <ul className="mt-4 space-y-2">
                                                {lessonItem.checklist.map(
                                                  (item, itemIndex) => {
                                                    const checked = mounted
                                                      ? isChecklistItemComplete(
                                                          course.slug,
                                                          lessonId,
                                                          itemIndex,
                                                        )
                                                      : false;

                                                    return (
                                                      <li key={`${lessonId}-${itemIndex}`}>
                                                        <label
                                                          className={cn(
                                                            "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                                                            checked
                                                              ? "border-green-500/25 bg-green-500/5"
                                                              : "border-white/8 bg-black/20 hover:border-primary/25",
                                                          )}
                                                        >
                                                          <span
                                                            className={cn(
                                                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                                              checked
                                                                ? "bg-green-500/20 text-green-400"
                                                                : "bg-white/8 text-white/45",
                                                            )}
                                                          >
                                                            {itemIndex + 1}
                                                          </span>
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
                                                            className="sr-only"
                                                          />
                                                          <span className="min-w-0 flex-1">
                                                            <span
                                                              className={cn(
                                                                "block text-sm leading-relaxed",
                                                                checked
                                                                  ? "text-white/50 line-through"
                                                                  : "text-white/90",
                                                              )}
                                                            >
                                                              {item.label}
                                                            </span>
                                                            {item.autoCompleteOnExternalLink && (
                                                              <ChecklistHint type="link" />
                                                            )}
                                                            {item.autoCompleteOnEmbeddedSteps && (
                                                              <ChecklistHint type="embedded" />
                                                            )}
                                                          </span>
                                                          {checked ? (
                                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                                                          ) : (
                                                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/20" />
                                                          )}
                                                        </label>
                                                      </li>
                                                    );
                                                  },
                                                )}
                                              </ul>
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
