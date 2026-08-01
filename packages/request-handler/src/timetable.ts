import type { LookupFunction } from "node:net";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { createRequestHandler } from "./lib/request-handler";
import { normalizeTimetableBaseUrl, readBoundedTimetableJsonAsync } from "./timetable-url";

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
const MAX_STATION_RESULTS = 100;
const MAX_TIMETABLE_ENTRIES = 100;
const timetableFetchOptions = { redirect: "error", timeout: 10_000, bodyTimeout: 10_000 } as const;

export interface TimetableResolvedAddress {
  address: string;
  family: 4 | 6;
}

export const timetableSearchStationsRequestHandler = createRequestHandler<
  Station[],
  { baseUrl: string; query: string; pinnedAddresses?: TimetableResolvedAddress[] }
>({
  async requestAsync(input) {
    return await searchStationsAsync(input.baseUrl, input.query, input.pinnedAddresses);
  },
  cacheTtlMs: 24 * 60 * 60 * 1000,
});

export const timetableGetTimetableRequestHandler = createRequestHandler<
  Timetable,
  { baseUrl: string; stationId: string; limit: number }
>({
  async requestAsync(input) {
    return await getTimetableAsync(input.baseUrl, { stationId: input.stationId, limit: input.limit });
  },
  cacheTtlMs: 60_000,
});

const buildUrl = (baseUrl: string, path: `/${string}`, queryParams: Record<string, string | number>) => {
  const url = new URL(`${normalizeTimetableBaseUrl(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value.toString());
  }
  return url.toString();
};

const normalizeLookupHostname = (hostname: string) =>
  hostname
    .replace(/^\[(.*)\]$/, "$1")
    .toLowerCase()
    .replace(/\.$/, "");

const createPinnedLookup = (baseUrl: string, addresses: TimetableResolvedAddress[]): LookupFunction => {
  const expectedHostname = normalizeLookupHostname(new URL(baseUrl).hostname);

  return (hostname, options, callback) => {
    const requestedFamily = options.family === 4 || options.family === 6 ? options.family : undefined;
    const candidates = requestedFamily ? addresses.filter(({ family }) => family === requestedFamily) : addresses;
    if (normalizeLookupHostname(hostname) !== expectedHostname || candidates.length === 0) {
      const error = new Error("Pinned timetable address is unavailable") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error, []);
      return;
    }

    if (options.all) {
      callback(null, candidates);
      return;
    }

    const selected = candidates[0];
    if (!selected) return callback(new Error("Pinned timetable address is unavailable"), []);
    callback(null, selected.address, selected.family);
  };
};

const createPinnedTimetableDispatcherAsync = async (baseUrl: string, addresses: TimetableResolvedAddress[]) => {
  // Proxies resolve CONNECT targets independently, which would defeat DNS pinning. Force this security-sensitive
  // configuration request to connect directly. The original URL remains unchanged for the Host header and TLS SNI.
  return await createCertificateAgentAsync(
    { lookup: createPinnedLookup(baseUrl, addresses) },
    {
      autoSelectFamily: addresses.length > 1,
      bodyTimeout: timetableFetchOptions.bodyTimeout,
      httpProxy: "",
      httpsProxy: "",
      noProxy: "*",
    },
  );
};

const searchStationsAsync = async (
  baseUrl: string,
  query: string,
  pinnedAddresses?: TimetableResolvedAddress[],
): Promise<Station[]> => {
  const dispatcher = pinnedAddresses ? await createPinnedTimetableDispatcherAsync(baseUrl, pinnedAddresses) : undefined;
  try {
    const response = await fetchWithTrustedCertificatesAsync(
      buildUrl(baseUrl, "/timetable/api/completion.json", { term: query, show_ids: 1, nofavorites: 1 }),
      { ...timetableFetchOptions, dispatcher },
    );
    if (!response.ok) throw new ResponseError(response);

    const body = await readBoundedTimetableJsonAsync(response);
    const data = await searchSchema.parseAsync(Array.isArray(body) ? body.slice(0, MAX_STATION_RESULTS) : body);
    return data
      .filter((item) => supportedStationTypes.some((type) => item.iconclass.endsWith(type)))
      .map((item) => (item.id !== undefined ? { id: item.id, name: item.label } : null))
      .filter((item) => item !== null);
  } finally {
    await dispatcher?.close();
  }
};

const getTimetableAsync = async (
  baseUrl: string,
  options: { stationId: string; limit: number },
): Promise<Timetable> => {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, "/timetable/api/stationboard.json", {
      stop: options.stationId,
      limit: options.limit,
      show_delays: 1,
      show_tracks: 1,
      date,
      time,
    }),
    timetableFetchOptions,
  );
  if (!response.ok) throw new ResponseError(response);

  const body = await readBoundedTimetableJsonAsync(response);
  const envelope = timetableEnvelopeSchema.parse(body);
  const data = await timetableSchema.parseAsync({
    connections: envelope.connections.slice(0, Math.min(options.limit, MAX_TIMETABLE_ENTRIES)),
  });
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

const timetableEnvelopeSchema = z.object({ connections: z.array(z.unknown()) });

const searchSchema = z.array(
  z.object({
    id: z.string().optional(),
    label: z.string(),
    iconclass: z.string(),
  }),
);
