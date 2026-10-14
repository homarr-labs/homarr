import type { LookupFunction } from "node:net";
import { z } from "zod/v4";

import { readBoundedJsonResponseAsync } from "@homarr/common/bounded-response";
import { ResponseError } from "@homarr/common/response-error";

import type { Station, Timetable, TimetableResolvedAddress } from "../timetable";
import type { OwnedRequestFactories } from "./factories";
import type { WidgetHttpResources } from "./resources";

const supportedStationTypes = ["bus", "tram", "train", "ship", "cablecar", "funicular", "chairlift"];
const MAX_STATION_RESULTS = 100;
const MAX_TIMETABLE_ENTRIES = 100;
const MAX_TIMETABLE_RESPONSE_BYTES = 512 * 1024;
const normalizeTimetableBaseUrl = (baseUrl: string) => {
  if (baseUrl.length > 2_048) throw new Error("Timetable base URL is too long");
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Timetable base URL must use HTTP or HTTPS");
  if (url.username || url.password) throw new Error("Timetable base URL must not contain credentials");
  if (url.search || url.hash) throw new Error("Timetable base URL must not contain a query or fragment");
  return url.toString().replace(/\/$/, "");
};
const timetableFetchOptions = { redirect: "error", timeout: 10_000, bodyTimeout: 10_000 } as const;
const buildUrl = (baseUrl: string, path: `/${string}`, queryParams: Record<string, string | number>) => {
  const url = new URL(`${normalizeTimetableBaseUrl(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(queryParams)) url.searchParams.set(key, value.toString());
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
      const error: NodeJS.ErrnoException = new Error("Pinned timetable address is unavailable");
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
const searchSchema = z.array(z.object({ id: z.string().optional(), label: z.string(), iconclass: z.string() }));

export const createTimetableRequests = (factories: OwnedRequestFactories, http: WidgetHttpResources) => {
  const createPinnedTimetableDispatcherAsync = (
    baseUrl: string,
    addresses: TimetableResolvedAddress[],
    signal: AbortSignal,
  ) =>
    http.createPinnedDispatcherAsync({
      lookup: createPinnedLookup(baseUrl, addresses),
      autoSelectFamily: addresses.length > 1,
      bodyTimeout: timetableFetchOptions.bodyTimeout,
      httpProxy: "",
      httpsProxy: "",
      noProxy: "*",
      signal,
    });
  const searchStationsAsync = async (
    baseUrl: string,
    query: string,
    signal: AbortSignal,
    pinnedAddresses?: TimetableResolvedAddress[],
  ): Promise<Station[]> => {
    signal.throwIfAborted();
    let dispatcher = pinnedAddresses
      ? await createPinnedTimetableDispatcherAsync(baseUrl, pinnedAddresses, signal)
      : undefined;
    let response: Awaited<ReturnType<WidgetHttpResources["fetchAsync"]>> | undefined;
    try {
      signal.throwIfAborted();
      response = await http.fetchAsync(
        buildUrl(baseUrl, "/timetable/api/completion.json", { term: query, show_ids: 1, nofavorites: 1 }),
        { ...timetableFetchOptions, dispatcher, signal },
      );
      if (!response.ok) throw new ResponseError(response);
      const body = await readBoundedJsonResponseAsync(response, MAX_TIMETABLE_RESPONSE_BYTES, "Timetable response");
      const data = await searchSchema.parseAsync(Array.isArray(body) ? body.slice(0, MAX_STATION_RESULTS) : body);
      return data
        .filter((item) => supportedStationTypes.some((type) => item.iconclass.endsWith(type)))
        .map((item) => (item.id !== undefined ? { id: item.id, name: item.label } : null))
        .filter((item) => item !== null);
    } catch (error) {
      if (response?.body) await response.body.cancel().catch(() => undefined);
      await dispatcher?.destroy().catch(() => undefined);
      dispatcher = undefined;
      throw error;
    } finally {
      await dispatcher?.close();
    }
  };
  const getTimetableAsync = async (
    baseUrl: string,
    options: { stationId: string; limit: number },
    signal: AbortSignal,
    pinnedAddresses?: TimetableResolvedAddress[],
  ): Promise<Timetable> => {
    signal.throwIfAborted();
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
    let dispatcher = pinnedAddresses
      ? await createPinnedTimetableDispatcherAsync(baseUrl, pinnedAddresses, signal)
      : undefined;
    let response: Awaited<ReturnType<WidgetHttpResources["fetchAsync"]>> | undefined;
    try {
      signal.throwIfAborted();
      response = await http.fetchAsync(
        buildUrl(baseUrl, "/timetable/api/stationboard.json", {
          stop: options.stationId,
          limit: options.limit,
          show_delays: 1,
          show_tracks: 1,
          date,
          time,
        }),
        { ...timetableFetchOptions, dispatcher, signal },
      );
      if (!response.ok) throw new ResponseError(response);
      const body = await readBoundedJsonResponseAsync(response, MAX_TIMETABLE_RESPONSE_BYTES, "Timetable response");
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
              ? { name: connection.line, color: color && color.length >= 1 ? `#${color}` : null }
              : null,
            location: connection.terminal.name,
            delay: connection.dep_delay,
            platform: connection.track
              ? { name: connection.track.replace("!", ""), hasChanged: connection.track.includes("!") }
              : null,
          };
        }),
      };
    } catch (error) {
      if (response?.body) await response.body.cancel().catch(() => undefined);
      await dispatcher?.destroy().catch(() => undefined);
      dispatcher = undefined;
      throw error;
    } finally {
      await dispatcher?.close();
    }
  };
  const timetableSearch = factories.createPlainRequestHandler<
    Station[],
    { baseUrl: string; query: string; pinnedAddresses?: TimetableResolvedAddress[] }
  >({
    async requestAsync(input, signal) {
      return await searchStationsAsync(input.baseUrl, input.query, signal, input.pinnedAddresses);
    },
    cacheTtlMs: 24 * 60 * 60 * 1000,
  });
  const timetableGet = factories.createPlainRequestHandler<
    Timetable,
    { baseUrl: string; stationId: string; limit: number; pinnedAddresses?: TimetableResolvedAddress[] }
  >({
    async requestAsync(input, signal) {
      return await getTimetableAsync(
        input.baseUrl,
        { stationId: input.stationId, limit: input.limit },
        signal,
        input.pinnedAddresses,
      );
    },
    cacheTtlMs: 60_000,
  });
  return { timetableGet, timetableSearch };
};
