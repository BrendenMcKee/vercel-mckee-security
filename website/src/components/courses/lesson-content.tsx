"use client";

import { useEffect, useRef } from "react";
import lessonContent from "@/content/courses/lesson-content.json";
import {
  readEmbeddedChecklistState,
  writeEmbeddedChecklistState,
} from "@/lib/course-progress";

type LessonContentEntry = {
  sourceUrl: string;
  html: string;
};

const contentMap = lessonContent as Record<string, LessonContentEntry>;

export function LessonContentPanel({ lessonId }: { lessonId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entry = contentMap[lessonId];

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !entry?.html) return;

    const handlers: Array<{ input: HTMLInputElement; fn: () => void }> = [];
    const inputs = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const saved = readEmbeddedChecklistState(lessonId);

    inputs.forEach((input, index) => {
      const key = input.id || String(index);
      if (saved[key]) input.checked = true;

      const fn = () => {
        const next = readEmbeddedChecklistState(lessonId);
        next[key] = input.checked;
        writeEmbeddedChecklistState(lessonId, next);
      };

      input.addEventListener("change", fn);
      handlers.push({ input, fn });
    });

    return () => {
      handlers.forEach(({ input, fn }) => input.removeEventListener("change", fn));
    };
  }, [lessonId, entry?.html]);

  if (!entry?.html) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-sm text-white/50">
        Lesson content is unavailable for this topic.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Lesson Content
      </p>
      <div
        ref={containerRef}
        className="course-lesson-html overflow-hidden rounded-xl border border-white/10 bg-white text-neutral-900 shadow-lg"
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
      <p className="text-xs text-white/40">
        Content migrated from the McKee Security technician training course. External
        links open manufacturer training portals where noted.
      </p>
    </div>
  );
}

export function hasLessonContent(lessonId: string) {
  return Boolean(contentMap[lessonId]?.html);
}
