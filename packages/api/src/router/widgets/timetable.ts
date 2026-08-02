import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { TRPCError } from "@trpc/server";
import { parse } from "superjson";
import z from "zod";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";
import type { TimetableResolvedAddress } from "@homarr/request-handler/timetable";
import {
  timetableGetTimetableRequestHandler,
  timetableSearchStationsRequestHandler,
} from "@homarr/request-handler/timetable";
import { DEFAULT_TIMETABLE_BASE_URL, normalizeTimetableBaseUrl } from "@homarr/request-handler/timetable-url";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

const baseUrlSchema = z.string().url().max(2_048);
const timetableSourceSchema = z.object({
  baseUrl: baseUrlSchema,
  itemId: z.string().max(100).optional(),
  boardId: z.string().max(100).optional(),
});
const timetableOptionsSchema = z.object({ baseUrl: z.string().optional() }).passthrough();

const blockedTimetableIpv4Addresses = new BlockList();
const blockedTimetableIpv6Addresses = new BlockList();
const blockedTimetableSubnets = [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 96, "ipv6"],
  ["::ffff:0:0", 96, "ipv6"],
  ["::ffff:0:0:0", 96, "ipv6"],
  ["64:ff9b::", 96, "ipv6"],
  ["64:ff9b:1::", 48, "ipv6"],
  ["100::", 64, "ipv6"],
  ["2001::", 32, "ipv6"],
  ["2001:2::", 48, "ipv6"],
  ["2001:10::", 28, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
  ["2002::", 16, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["fec0::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
] as const;

for (const [network, prefix, family] of blockedTimetableSubnets) {
  const blockList = family === "ipv4" ? blockedTimetableIpv4Addresses : blockedTimetableIpv6Addresses;
  blockList.addSubnet(network, prefix, family);
}

const normalizeBaseUrlOrThrowBadRequest = (baseUrl: string) => {
  try {
    return normalizeTimetableBaseUrl(baseUrl);
  } catch (cause) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: cause instanceof Error ? cause.message : "Invalid timetable base URL",
      cause,
    });
  }
};

const throwInvalidSavedTimetableConfiguration = (cause: unknown): never => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Timetable widget configuration is invalid",
    cause,
  });
};

const parseSavedTimetableOptions = (serializedOptions: string) => {
  try {
    return timetableOptionsSchema.parse(parse<unknown>(serializedOptions));
  } catch (cause) {
    return throwInvalidSavedTimetableConfiguration(cause);
  }
};

const normalizeSavedTimetableBaseUrl = (baseUrl: string) => {
  try {
    return normalizeTimetableBaseUrl(baseUrl);
  } catch (cause) {
    return throwInvalidSavedTimetableConfiguration(cause);
  }
};

const normalizeHostname = (hostname: string) => {
  const withoutBrackets = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return withoutBrackets.toLowerCase().replace(/\.$/, "");
};

const isBlockedTimetableAddress = (address: string, family: number) => {
  return family === 6
    ? blockedTimetableIpv6Addresses.check(address, "ipv6")
    : blockedTimetableIpv4Addresses.check(address, "ipv4");
};

const resolvePublicTimetableAddressesAsync = async (baseUrl: string): Promise<TimetableResolvedAddress[]> => {
  const hostname = normalizeHostname(new URL(baseUrl).hostname);
  const hostnameFamily = isIP(hostname);
  const isInternalHostname =
    hostnameFamily === 0 &&
    (!hostname.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home.arpa"));

  if (isInternalHostname) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Timetable base URL must use a public host" });
  }

  let addresses: TimetableResolvedAddress[];
  try {
    const resolvedAddresses =
      hostnameFamily === 0
        ? await lookup(hostname, { all: true, verbatim: true })
        : [{ address: hostname, family: hostnameFamily }];
    addresses = resolvedAddresses.filter(
      (entry): entry is TimetableResolvedAddress => entry.family === 4 || entry.family === 6,
    );
  } catch (cause) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Timetable base URL host could not be resolved",
      cause,
    });
  }

  if (addresses.length === 0 || addresses.some(({ address, family }) => isBlockedTimetableAddress(address, family))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Timetable base URL must not target a private or internal address",
    });
  }

  return addresses;
};

const normalizeTimetableOptionsBaseUrlOrThrowBadRequest = (options: Record<string, unknown>) => {
  const parsedOptions = timetableOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid timetable widget options" });
  }
  return normalizeBaseUrlOrThrowBadRequest(parsedOptions.data.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
};

export const validateTimetableOptionsChangeAsync = async (
  nextOptions: Record<string, unknown>,
  previousOptions?: Record<string, unknown>,
) => {
  const nextBaseUrl = normalizeTimetableOptionsBaseUrlOrThrowBadRequest(nextOptions);
  if (nextBaseUrl === DEFAULT_TIMETABLE_BASE_URL) return;

  let previousBaseUrl: string | undefined;
  if (previousOptions) {
    try {
      previousBaseUrl = normalizeTimetableOptionsBaseUrlOrThrowBadRequest(previousOptions);
    } catch {
      // Invalid legacy options must not prevent replacing them with a valid configuration.
    }
  }
  if (nextBaseUrl === previousBaseUrl) return;

  await resolvePublicTimetableAddressesAsync(nextBaseUrl);
};

const getSavedTimetableBaseUrl = (serializedOptions: string) => {
  const options = parseSavedTimetableOptions(serializedOptions);
  return normalizeSavedTimetableBaseUrl(options.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
};

interface ResolvedTimetableSource {
  baseUrl: string;
  pinnedAddresses?: TimetableResolvedAddress[];
}

const resolveTimetableBaseUrlAsync = async (
  ctx: { db: Database; session: Session | null },
  input: z.infer<typeof timetableSourceSchema>,
  allowBoardConfiguration = false,
): Promise<ResolvedTimetableSource> => {
  const requestedBaseUrl = normalizeBaseUrlOrThrowBadRequest(input.baseUrl);
  if (allowBoardConfiguration) {
    if (input.boardId) {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      let savedOptions: string | undefined;
      if (input.itemId) {
        const item = await ctx.db.query.items.findFirst({
          where: and(eq(items.id, input.itemId), eq(items.kind, "timetable"), eq(items.boardId, input.boardId)),
        });
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Timetable widget not found" });
        savedOptions = item.options;
      }
      const savedBaseUrl = savedOptions === undefined ? undefined : getSavedTimetableBaseUrl(savedOptions);
      if (requestedBaseUrl === savedBaseUrl || requestedBaseUrl === DEFAULT_TIMETABLE_BASE_URL) {
        return { baseUrl: requestedBaseUrl };
      }

      const pinnedAddresses = await resolvePublicTimetableAddressesAsync(requestedBaseUrl);
      return { baseUrl: requestedBaseUrl, pinnedAddresses };
    }
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Board modify access is required for this endpoint" });
    }
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }
  if (!input.itemId) {
    if (requestedBaseUrl !== DEFAULT_TIMETABLE_BASE_URL) {
      throw new TRPCError({ code: "FORBIDDEN", message: "A saved timetable widget is required for this endpoint" });
    }
    return { baseUrl: DEFAULT_TIMETABLE_BASE_URL };
  }

  const item = await ctx.db.query.items.findFirst({
    where: and(eq(items.id, input.itemId), eq(items.kind, "timetable")),
  });
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Timetable widget not found" });

  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const savedBaseUrl = getSavedTimetableBaseUrl(item.options);
  if (requestedBaseUrl !== savedBaseUrl) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Timetable URL does not match the saved widget" });
  }
  return { baseUrl: savedBaseUrl };
};

export const timetableRouter = createTRPCRouter({
  getTimetable: publicProcedure
    .input(
      timetableSourceSchema.extend({
        stationId: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { baseUrl } = await resolveTimetableBaseUrlAsync(ctx, input);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableGetTimetableRequestHandler.handler({ ...handlerInput, baseUrl }).getDataAsync();
      return data;
    }),
  searchStations: publicProcedure
    .input(
      timetableSourceSchema.extend({
        query: z.string().max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { baseUrl, pinnedAddresses } = await resolveTimetableBaseUrlAsync(ctx, input, true);
      const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
      const { data } = await timetableSearchStationsRequestHandler
        .handler({ ...handlerInput, baseUrl, pinnedAddresses })
        .getDataAsync();
      return data;
    }),
});
