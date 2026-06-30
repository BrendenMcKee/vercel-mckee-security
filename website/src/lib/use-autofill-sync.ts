"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnimationEvent } from "react";
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormSetValue,
} from "react-hook-form";

// Must match the keyframe name defined in mckee-forms.css.
const AUTOFILL_ANIMATION = "mckee-autofill-start";

type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isFillable(el: EventTarget | Element | null): el is Fillable {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

/**
 * Browsers can autofill fields without firing the input/change events that
 * react-hook-form relies on, leaving its internal values empty. With a zod
 * resolver, submit validates that empty state and wrongly reports filled-in
 * fields as missing. We detect autofill via the `:-webkit-autofill` CSS
 * animation (which bubbles up to the form element) plus a short mount scan, then
 * copy the DOM values into the form state so validation sees what the user sees.
 *
 * Spread the returned `formRef` and `onAnimationStart` onto the <form> element.
 */
export function useAutofillSync<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
) {
  const formRef = useRef<HTMLFormElement | null>(null);

  const sync = useCallback(
    (el: EventTarget | Element | null) => {
      if (!isFillable(el)) return;
      // Never sync honeypot/anti-spam fields. Chrome ignores autocomplete="off"
      // and will autofill a hidden "Company" trap; copying that value into the
      // form makes a real submission look like a bot and get silently dropped.
      if (el.dataset.honeypot === "true") return;
      const name = el.name;
      if (!name || el.value === "") return;
      setValue(name as Path<T>, el.value as PathValue<T, Path<T>>, {
        shouldValidate: false,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue],
  );

  const onAnimationStart = useCallback(
    (event: AnimationEvent<HTMLFormElement>) => {
      if (event.animationName === AUTOFILL_ANIMATION) {
        sync(event.target);
      }
    },
    [sync],
  );

  // Catch page-load autofill that may have fired before React attached the
  // bubbling listener above.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const scan = () => {
      let matches: Element[] = [];
      try {
        matches = Array.from(form.querySelectorAll(":-webkit-autofill"));
      } catch {
        matches = [];
      }
      matches.forEach(sync);
    };
    const timers = [80, 400].map((delay) => window.setTimeout(scan, delay));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [sync]);

  return { formRef, onAnimationStart };
}
