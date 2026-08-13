/** How long a client waits between alarm-list saves (emails McKee each time). */
export const CALLER_ID_CLIENT_COOLDOWN_SECONDS = 120;

export function formatWaitDuration(seconds: number): string {
  const remaining = Math.max(1, Math.ceil(seconds));
  const minutes = Math.floor(remaining / 60);
  const leftover = remaining % 60;
  if (minutes === 0) return leftover === 1 ? "1 second" : `${leftover} seconds`;
  const minutePart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  if (leftover === 0) return minutePart;
  const secondPart = leftover === 1 ? "1 second" : `${leftover} seconds`;
  return `${minutePart} ${secondPart}`;
}

/** Calm copy: this is a pause, not a failed save. */
export function callerIdWaitMessage(waitSeconds: number): string {
  return (
    `We already have your last change and McKee Security has been emailed. ` +
    `Please wait a couple of minutes so they can update the monitoring station. ` +
    `You can save again in ${formatWaitDuration(waitSeconds)}.`
  );
}
