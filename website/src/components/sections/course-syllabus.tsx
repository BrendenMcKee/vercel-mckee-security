"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Course } from "@/lib/courses";
import { cn } from "@/lib/utils";

export function CourseSyllabus({ course }: { course: Course }) {
  const [openModule, setOpenModule] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {course.modules.map((mod, mi) => (
        <div
          key={mod.title}
          className="overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/40"
        >
          <button
            type="button"
            onClick={() => setOpenModule(openModule === mi ? null : mi)}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <span className="text-lg font-bold text-white">{mod.title}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-white/50 transition",
                openModule === mi && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {openModule === mi && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5"
              >
                <div className="space-y-4 p-6 pt-2">
                  {mod.topics.map((topic) => (
                    <div key={topic.title}>
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="font-semibold text-white/90">{topic.title}</h4>
                        {topic.duration && (
                          <span className="shrink-0 text-xs text-white/40">
                            {topic.duration}
                          </span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-2 pl-4">
                        {topic.lessons.map((lesson) => (
                          <li
                            key={lesson.title}
                            className="flex items-center justify-between text-sm text-white/60"
                          >
                            <span>{lesson.title}</span>
                            {lesson.duration && (
                              <span className="text-xs text-white/35">
                                {lesson.duration}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
