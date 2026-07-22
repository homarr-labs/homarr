import { z } from "zod/v4";

const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string().nullish(),
  ranking: z.number().nullish(),
});

const scoreSchema = z.object({
  // games[0] holds the per-set game count of player one, games[1] of player two.
  games: z.array(z.array(z.number())).nullish(),
  sets: z.array(z.number()).nullish(),
  // points are the current game points, e.g. ["40", "AD"]. Absent between games.
  points: z.array(z.string()).nullish(),
  server: z.number().nullish(),
});

const matchSchema = z.object({
  id: z.number(),
  status: z.string(),
  tournament: z.string().nullish(),
  surface: z.string().nullish(),
  scheduled_time: z.string().nullish(),
  players: z.object({ p1: playerSchema, p2: playerSchema }),
  score: scoreSchema.nullish(),
});

const responseSchema = z.object({
  data: z.array(matchSchema),
});

const toPlayer = (player: z.infer<typeof playerSchema>, index: 0 | 1, score: z.infer<typeof scoreSchema> | null) => ({
  id: player.id,
  name: player.name,
  // The API returns lowercase ISO-3166 alpha-3 style codes, e.g. "esp".
  country: player.country?.toUpperCase() ?? null,
  ranking: player.ranking ?? null,
  games: score?.games?.[index] ?? [],
  sets: score?.sets?.[index] ?? 0,
  points: score?.points?.[index] ?? null,
  isServing: score?.server === index + 1,
});

const mapMatch = (match: z.infer<typeof matchSchema>) => ({
  id: match.id,
  status: match.status,
  tournament: match.tournament ?? null,
  surface: match.surface ?? null,
  scheduledTime: match.scheduled_time ?? null,
  players: [
    toPlayer(match.players.p1, 0, match.score ?? null),
    toPlayer(match.players.p2, 1, match.score ?? null),
  ] as const,
});

/** Validates a raw Live Tennis API response body and maps it onto the shape the widget consumes. */
export const parseTennisResponse = (body: unknown) => ({
  matches: responseSchema.parse(body).data.map(mapMatch),
});
