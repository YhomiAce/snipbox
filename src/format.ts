/** Formats a date as e.g. "28 Oct 2026, 14:05 UTC". */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(date)) + " UTC";
}

/** Describes how long until a date, e.g. "in 3 hours"; returns "never" for null. */
export function timeLeft(date: Date | string | null | undefined, now: Date = new Date()): string {
  if (!date) return "never";
  const seconds = Math.max(0, Math.round((new Date(date).getTime() - now.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (seconds < 3600) return rtf.format(Math.max(1, Math.round(seconds / 60)), "minute");
  if (seconds < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}
