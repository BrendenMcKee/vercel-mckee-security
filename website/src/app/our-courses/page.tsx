import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { CoursesCatalog } from "@/components/courses/courses-catalog";

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
        <CoursesCatalog />
      </section>
    </>
  );
}
