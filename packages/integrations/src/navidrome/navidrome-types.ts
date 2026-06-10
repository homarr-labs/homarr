import { z } from "zod/v4";

const subsonicArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  albumCount: z.number().optional(),
});

const subsonicIndexSchema = z.object({
  name: z.string(),
  artist: z.union([subsonicArtistSchema, z.array(subsonicArtistSchema)]).optional(),
});

const subsonicAlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  songCount: z.number().optional(),
});

const subsonicNowPlayingEntrySchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  album: z.string().optional(),
  username: z.string().optional(),
  playerName: z.string().optional(),
});

export const subsonicResponseSchema = z.object({
  "subsonic-response": z.object({
    status: z.enum(["ok", "failed"]),
    version: z.string().optional(),
    error: z
      .object({
        code: z.number(),
        message: z.string(),
      })
      .optional(),
    artists: z
      .object({
        index: z.union([subsonicIndexSchema, z.array(subsonicIndexSchema)]).optional(),
      })
      .optional(),
    albumList2: z
      .object({
        album: z.union([subsonicAlbumSchema, z.array(subsonicAlbumSchema)]).optional(),
      })
      .optional(),
    nowPlaying: z
      .object({
        entry: z.union([subsonicNowPlayingEntrySchema, z.array(subsonicNowPlayingEntrySchema)]).optional(),
      })
      .optional(),
  }),
});

export type SubsonicResponseBody = z.infer<typeof subsonicResponseSchema>["subsonic-response"];

export interface NavidromeNowPlayingEntry {
  title: string;
  artist: string;
  album: string;
  username: string;
  playerName: string;
}

export interface NavidromeDashboardData {
  artistCount: number;
  albumCount: number;
  songCount: number;
  nowPlaying: NavidromeNowPlayingEntry[];
}
