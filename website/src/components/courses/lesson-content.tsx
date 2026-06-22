"use client";

import { useEffect, useMemo, useRef } from "react";
import { ExternalLink } from "lucide-react";
import lessonContent from "@/content/courses/lesson-content.json";
import {
  markExternalLinkPending,
  readEmbeddedChecklistState,
  writeEmbeddedChecklistState,
} from "@/lib/course-progress";
import { cn } from "@/lib/utils";
import { getLessonLayoutClass, prepareLessonHtml } from "@/lib/lesson-html";

type LessonContentEntry = {
  sourceUrl: string;
  html: string;
};

const contentMap = lessonContent as Record<string, LessonContentEntry>;

type LessonContentPanelProps = {
  lessonId: string;
  onEmbeddedProgressChange?: () => void;
};

export function LessonContentPanel({
  lessonId,
  onEmbeddedProgressChange,
}: LessonContentPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const entry = contentMap[lessonId];

  const preparedHtml = useMemo(
    () => (entry?.html ? prepareLessonHtml(entry.html) : ""),
    [entry],
  );

  const layoutClass = useMemo(
    () => (entry?.html ? getLessonLayoutClass(entry.html) : ""),
    [entry],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !preparedHtml) return;

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
        onEmbeddedProgressChange?.();
      };

      input.addEventListener("change", fn);
      handlers.push({ input, fn });
    });

    const linkHandlers: Array<{ link: HTMLAnchorElement; fn: () => void }> = [];
    root.querySelectorAll<HTMLAnchorElement>("a.mckee-external-link").forEach((link) => {
      const fn = () => markExternalLinkPending(lessonId);
      link.addEventListener("click", fn);
      linkHandlers.push({ link, fn });
    });

    return () => {
      handlers.forEach(({ input, fn }) => input.removeEventListener("change", fn));
      linkHandlers.forEach(({ link, fn }) => link.removeEventListener("click", fn));
    };
  }, [lessonId, preparedHtml, onEmbeddedProgressChange]);

  if (!preparedHtml) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-black/30 px-6 py-10 text-center text-sm text-white/50">
        Lesson content is unavailable for this topic.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("course-lesson-html min-w-0 w-full max-w-none", layoutClass)}
      dangerouslySetInnerHTML={{ __html: preparedHtml }}
    />
  );
}

export function hasLessonContent(lessonId: string) {
  return Boolean(contentMap[lessonId]?.html);
}

export function getLessonHtml(lessonId: string) {
  return contentMap[lessonId]?.html ?? "";
}

export function ChecklistHint({ type }: { type: "link" | "embedded" }) {
  if (type === "link") {
    return (
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-secondary">
        <ExternalLink className="h-3 w-3" />
        Auto-completes when you open the link and return to this page
      </span>
    );
  }

  return (
    <span className="mt-1 block text-[11px] text-white/40">
      Auto-completes when every hands-on step above is checked off
    </span>
  );
}
