import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/sections/hero";
import { CoursePlayer } from "@/components/courses/course-player";
import { FadeIn } from "@/components/motion/fade-in";
import { getCourseBySlug } from "@/lib/courses";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [{ slug: "mckee-security-technician" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return {};
  return { title: course.title, description: course.description };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  return (
    <>
      <Hero
        eyebrow="Free Training"
        title={course.title}
        subtitle={course.description}
        compact
      />

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <h2 className="mb-2 text-2xl font-bold text-white">Course Content</h2>
            <p className="mb-8 text-sm text-white/55">
              Expand a module, select a lesson, and work through the embedded training
              materials from our technician course.
            </p>
          </FadeIn>
          <CoursePlayer course={course} />
        </div>
      </section>
    </>
  );
}
