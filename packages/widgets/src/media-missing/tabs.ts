export type MediaMissingTab = "missing" | "queued";

export const resolveMediaMissingTab = (
  current: MediaMissingTab,
  showMissing: boolean,
  showQueued: boolean,
): MediaMissingTab | null => {
  if (current === "missing" && showMissing) return current;
  if (current === "queued" && showQueued) return current;
  if (showMissing) return "missing";
  if (showQueued) return "queued";
  return null;
};
