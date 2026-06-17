/** Normalize migrated WordPress lesson HTML for the McKee dark course UI */
export function prepareLessonHtml(html: string): string {
  return html
    .replace(/<div[^>]*class="[^"]*wp-block-spacer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(
      /<a([^>]*href="https?:\/\/[^"]+"[^>]*)>/gi,
      (_match, attrs: string) => {
        let next = attrs;
        if (!/target=/i.test(next)) {
          next += ' target="_blank" rel="noopener noreferrer"';
        }
        if (/class="/i.test(next)) {
          next = next.replace(/class="([^"]*)"/i, 'class="$1 mckee-external-link"');
        } else {
          next += ' class="mckee-external-link"';
        }
        return `<a${next}>`;
      },
    )
    .replace(
      /<iframe([^>]*)>/gi,
      '<iframe$1 loading="lazy" title="Training video">',
    );
}

export function countEmbeddedCheckboxes(html: string): number {
  return (html.match(/type="checkbox"/gi) ?? []).length;
}

export function getEmbeddedCheckboxProgress(lessonId: string, html: string) {
  if (typeof window === "undefined") return { checked: 0, total: 0 };

  const total = countEmbeddedCheckboxes(html);
  if (total === 0) return { checked: 0, total: 0 };

  try {
    const raw = localStorage.getItem(`mckee-lesson-html-checks:${lessonId}`);
    const state = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const checked = Object.values(state).filter(Boolean).length;
    return { checked: Math.min(checked, total), total };
  } catch {
    return { checked: 0, total };
  }
}
