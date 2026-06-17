"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { courses } from "@/lib/courses";
import { getCourseProgress } from "@/lib/course-progress";
import { useEffect, useState } from "react";

export function CoursesCatalog() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 lg:max-w-7xl xl:max-w-[1280px]">
      {courses.map((course, i) => {
        const progress = mounted ? getCourseProgress(course) : null;

        return (
          <FadeIn key={course.slug} delay={i * 0.08}>
            <Link
              href={course.href}
              className="group block cursor-pointer rounded-2xl border border-white/10 bg-surface-elevated/40 p-8 transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold uppercase text-green-400">
                      {course.price}
                    </span>
                    {progress && progress.percent > 0 && (
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                        {progress.percent}% complete
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-white transition group-hover:text-primary">
                    {course.title}
                  </h2>
                  <p className="mt-2 text-white/60">{course.description}</p>

                  {progress && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                        <span>
                          {progress.checkedItems} / {progress.totalItems} steps ·{" "}
                          {progress.completedLessons} / {progress.totalLessons} lessons
                        </span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/40">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-[#e04545] transition-all duration-500"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          </FadeIn>
        );
      })}
    </div>
  );
}
