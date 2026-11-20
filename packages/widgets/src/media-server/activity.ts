import type { StreamSession } from "@homarr/integrations";

import type { WidgetActivityFacts } from "../activity";

export const getMediaServerActivityFacts = (sessions: readonly StreamSession[]): WidgetActivityFacts => {
  let playing = 0;
  let paused = 0;
  for (const session of sessions) {
    if (!session.currentlyPlaying) continue;
    if (session.currentlyPlaying.playback?.state === "paused") paused++;
    else playing++;
  }
  if (playing > 0) return { relevance: "playback", count: playing + paused };
  if (paused > 0) return { relevance: "background", count: paused };
  return { relevance: "quiet", count: 0 };
};

export const hasMediaServerAutoExpandActivity = (data: unknown): boolean =>
  Array.isArray(data) &&
  data.some(
    (pair) =>
      typeof pair === "object" &&
      pair !== null &&
      (("error" in pair && Boolean(pair.error)) ||
        ("sessions" in pair && Array.isArray(pair.sessions) && pair.sessions.length > 0)),
  );
