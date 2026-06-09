import { z } from "zod/v4";

export const audiobookshelfLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mediaType: z.enum(["book", "podcast"]),
});

export const audiobookshelfLibrariesResponseSchema = z.object({
  libraries: z.array(audiobookshelfLibrarySchema),
});

export const audiobookshelfLibraryStatsSchema = z.object({
  totalItems: z.number(),
  totalDuration: z.number().optional(),
  totalSize: z.number().optional(),
});

export const audiobookshelfListeningStatsSchema = z.object({
  totalTime: z.number(),
});

export const audiobookshelfOnlineUsersResponseSchema = z.object({
  openSessions: z.array(z.unknown()),
});

export interface AudiobookshelfDashboardData {
  libraryCount: number;
  totalAudiobooks: number;
  totalPodcasts: number;
  totalListeningTimeSeconds: number;
  activeSessions: number;
}

export type AudiobookshelfLibrary = z.infer<typeof audiobookshelfLibrarySchema>;
export type AudiobookshelfLibraryStats = z.infer<typeof audiobookshelfLibraryStatsSchema>;
