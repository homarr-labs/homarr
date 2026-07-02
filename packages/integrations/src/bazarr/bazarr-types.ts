import { z } from "zod/v4";

export const bazarrBadgesSchema = z.object({
  episodes: z.number(),
  movies: z.number(),
  providers: z.number(),
  status: z.number(),
  sonarr_signalr: z.string(),
  radarr_signalr: z.string(),
  announcements: z.number(),
});

export type BazarrBadges = z.infer<typeof bazarrBadgesSchema>;

export const bazarrSystemStatusSchema = z.object({
  data: z.object({
    bazarr_version: z.string(),
  }),
});
