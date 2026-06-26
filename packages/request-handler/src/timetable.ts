import dayjs from "dayjs";
import z from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createWidgetOptionsChannel } from "@homarr/redis";

import { createCachedRequestHandler } from "./lib/cached-request-handler";

export interface Station {
  id: string;
  name: string;
}

export interface TimetableEntry {
  timestamp: Date;
  delay: number;
  line: {
    name: string;
    color: string | null;
  } | null;
  location: string;
  platform: {
    name: string;
    hasChanged: boolean;
  } | null;
}

export interface Timetable {
  stationId: string;
  timestamp: Date;
  entries: TimetableEntry[];
}

const supportedStationTypes = ["bus", "tram", "train", "ship", "cablecar", "funicular", "chairlift"];

export const timetableSearchStationsRequestHandler = {
  handler: (itemOptions: { baseUrl: string; query: string }) =>
    createCachedRequestHandler<Station[], { baseUrl: string; query: string }>({
      async requestAsync(input) {
        return await searchStationsAsync(input.baseUrl, input.query);
      },
      queryKey: "timetableSearchStations",
      cacheDuration: dayjs.duration(1, "day"),
      createRedisChannel(input, handlerOptions) {
        return createWidgetOptionsChannel<Station[]>("timetable", handlerOptions.queryKey, input);
      },
    }).handler(itemOptions),
};

export const timetableGetTimetableRequestHandler = {
  handler: (itemOptions: { baseUrl: string; stationId: string; limit: number }) =>
    createCachedRequestHandler<Timetable, { baseUrl: string; stationId: string; limit: number }>({
      async requestAsync(input) {
        return await getTimetableAsync(input.baseUrl, { stationId: input.stationId, limit: input.limit });
      },
      queryKey: "timetableGetTimetable",
      cacheDuration: dayjs.duration(1, "minute"),
      createRedisChannel(input, handlerOptions) {
        return createWidgetOptionsChannel<Timetable>("timetable", handlerOptions.queryKey, input);
      },
    }).handler(itemOptions),
};

const buildUrl = (baseUrl: string, path: `/${string}`, queryParams: Record<string, string | number>) => {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value.toString());
  }
  return url;
};

const searchStationsAsync = async (baseUrl: string, query: string): Promise<Station[]> => {
  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, "/timetable/api/completion.json", { term: query, show_ids: 1, nofavorites: 1 }),
  );
  if (!response.ok) throw new ResponseError(response);

  const data = await searchSchema.parseAsync(await response.json());
  return data
    .filter((item) => supportedStationTypes.some((type) => item.iconclass.endsWith(type)))
    .map((item) => (item.id !== undefined ? { id: item.id, name: item.label } : null))
    .filter((item) => item !== null);
};

const getTimetableAsync = async (
  baseUrl: string,
  options: { stationId: string; limit: number },
): Promise<Timetable> => {
  const now = new Date();
  const [date, time] = now.toLocaleString("en-CH", { timeZone: "Europe/Zurich" }).split(", ") as [string, string];
  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, "/timetable/api/stationboard.json", {
      stop: options.stationId,
      limit: options.limit,
      show_delays: 1,
      show_tracks: 1,
      date,
      time: time.substring(0, 5),
    }),
  );
  if (!response.ok) throw new ResponseError(response);

  const data = await timetableSchema.parseAsync(await response.json());
  return {
    stationId: options.stationId,
    timestamp: now,
    entries: data.connections.map((connection) => {
      const color = connection.color.split("~")[0];
      return {
        timestamp: connection.time,
        line: connection.line
          ? {
              name: connection.line,
              color: color && color.length >= 1 ? `#${color}` : null,
            }
          : null,
        location: connection.terminal.name,
        delay: connection.dep_delay,
        platform: connection.track
          ? {
              name: connection.track.replace("!", ""),
              hasChanged: connection.track.includes("!"),
            }
          : null,
      };
    }),
  };
};

const timetableSchema = z.object({
  connections: z.array(
    z.object({
      time: z.string().transform((str) => new Date(str)),
      line: z.string().optional(),
      color: z.string(),
      terminal: z.object({ name: z.string() }),
      track: z.string().optional(),
      dep_delay: z
        .string()
        .optional()
        .transform((str) => (str ? parseInt(str) : 0)),
    }),
  ),
});

const searchSchema = z.array(
  z.object({
    id: z.string().optional(),
    label: z.string(),
    iconclass: z.string(),
  }),
);
