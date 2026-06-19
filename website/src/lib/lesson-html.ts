/** Normalize migrated WordPress lesson HTML for the McKee dark course UI */
export function prepareLessonHtml(html: string): string {
  let result = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<div[^>]*class="[^"]*wp-block-spacer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  result = result.replace(/style="([^"]*)"/gi, (_match, styles: string) => {
    const cleaned = styles
      .replace(/background-color:\s*(white|#fff(?:fff)?|#f3f3f3|#f9f9f9|#eeeeee|#eee|#e9e9e9)\s*;?/gi, "")
      .replace(/background:\s*(white|#fff(?:fff)?|#f3f3f3|#f9f9f9|#e9e9e9)\s*;?/gi, "")
      .replace(/box-shadow:\s*[^;]+;?/gi, "")
      .replace(/color:\s*#(?:333|666|660000)\s*;?/gi, "")
      .replace(/margin-left:\s*-[\d.]+px\s*;?/gi, "")
      .replace(/margin-bottom:\s*-[\d.]+px\s*;?/gi, "")
      .replace(/margin-top:\s*-[\d.]+px\s*;?/gi, "")
      .replace(/;\s*;/g, ";")
      .trim()
      .replace(/^;+|;+$/g, "");

    return cleaned ? `style="${cleaned}"` : "";
  });

  result = result.replace(/\sstyle=""\s*/gi, " ");

  result = normalizeWireColors(result);

  result = result
    .replace(
      /<tr\s+style="background-color:\s*#e9e9e9;">/gi,
      '<tr class="mckee-table-head">',
    )
    .replace(
      /<tr\s+style="background-color:\s*#f3f3f3;">/gi,
      '<tr class="mckee-table-head">',
    )
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
    .replace(/<iframe([^>]*)>/gi, '<iframe$1 loading="lazy" title="Training video">');

  return result.trim();
}

/** Layout class for course lesson HTML — centered enrollment vs left-aligned guides */
export function getLessonLayoutClass(html: string): string {
  if (
    /toc-container|checklist-item|dahua-section|ubiquiti-section|Installation Progress|step-container/i.test(
      html,
    )
  ) {
    return "mckee-lesson-guide";
  }

  if (
    /has-text-align-center|Visit the Honeywell Academy|is-content-justification-center/i.test(
      html,
    )
  ) {
    return "mckee-lesson-centered";
  }

  return "";
}

function normalizeWireColors(html: string): string {
  const replacements: Array<[RegExp, string]> = [
    [
      /<span[^>]*color:\s*#(?:ff0000|FF0000)[^>]*>\s*RED\s*<\/span>/gi,
      '<span class="wire-badge wire-red">RED</span>',
    ],
    [
      /<span[^>]*color:\s*#(?:000000|000)\b[^>]*>\s*BLACK\s*<\/span>/gi,
      '<span class="wire-badge wire-black">BLACK</span>',
    ],
    [
      /<span[^>]*color:\s*#(?:008000|008000)[^>]*>\s*GREEN\s*<\/span>/gi,
      '<span class="wire-badge wire-green">GREEN</span>',
    ],
    [
      /<span[^>]*color:\s*#(?:ffff00|FFD700|ff0)\b[^>]*>\s*YELLOW\s*<\/span>/gi,
      '<span class="wire-badge wire-yellow">YELLOW</span>',
    ],
  ];

  return replacements.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    html,
  );
}

export function countEmbeddedCheckboxes(html: string): number {
  return (html.match(/type="checkbox"/gi) ?? []).length;
}

/** Long guides with embedded checklists benefit from a second progress panel after the material. */
export function isSubstantialLesson(html: string): boolean {
  if (!html) return false;

  const prepared = prepareLessonHtml(html);
  const layoutClass = getLessonLayoutClass(prepared);
  const checkboxCount = countEmbeddedCheckboxes(prepared);
  const length = prepared.length;

  if (
    layoutClass === "mckee-lesson-centered" &&
    length < 5000 &&
    checkboxCount === 0
  ) {
    return false;
  }

  if (length < 8000 && checkboxCount === 0) {
    return false;
  }

  return true;
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
    return { checked: 0, total: 0 };
  }
}
