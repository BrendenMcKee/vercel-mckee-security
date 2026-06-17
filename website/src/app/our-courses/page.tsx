import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/sections/hero";
import { FadeIn } from "@/components/motion/fade-in";
import { courses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Our Courses",
  description: "Free technician training courses from McKee Security and Audio Systems.",
};

export default function CoursesPage() {
  return (
    <>
      <Hero
        eyebrow="McKee Security Training"
        title="Mastering technology and building confidence"
        subtitle="Free structured courses for our technicians. No login required. Learn at your own pace."
        compact
      />

      <section className="py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-6">
          {courses.map((course, i) => (
            <FadeIn key={course.slug} delay={i * 0.08}>
              <Link
                href={course.href}
                className="group block rounded-2xl border border-white/10 bg-surface-elevated/40 p-8 transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold uppercase text-green-400">
                      {course.price}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-white group-hover:text-primary">
                      {course.title}
                    </h2>
                    <p className="mt-2 text-white/60">{course.description}</p>
                  </div>
                  <ArrowRight className="h-6 w-6 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>
    </>
  );
}
