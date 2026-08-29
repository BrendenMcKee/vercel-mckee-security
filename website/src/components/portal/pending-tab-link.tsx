"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent, type ReactNode } from "react";

const TAB_BASE =
  "relative isolate shrink-0 overflow-hidden whitespace-nowrap rounded-t-xl px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-wide sm:px-5 sm:text-sm";

/**
 * Query-param tabs wait on a server render. Show a chasing red border on the
 * tab you clicked until the new panel is ready, instead of a dead click.
 */
export function PendingTabLink({
  href,
  active,
  prefetch,
  children,
}: {
  href: string;
  active: boolean;
  prefetch?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }
    if (active) return;
    event.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }

  const stateClass = pending
    ? "portal-tab-pending text-white"
    : active
      ? "border border-b-0 border-white/10 bg-surface text-white"
      : "text-white/50 transition-colors hover:text-white";

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      className={`${TAB_BASE} ${stateClass}`}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}
