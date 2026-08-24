import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { TRPCError } from "@trpc/server";
import { parse } from "superjson";
import z from "zod";

import type { TimetableResolvedAddress } from "@homarr/request-handler/timetable";
import { DEFAULT_TIMETABLE_BASE_URL, normalizeTimetableBaseUrl } from "@homarr/request-handler/timetable-url";

const timetableOptionsSchema = z.object({ baseUrl: z.string().optional() }).passthrough();

const blockedTimetableIpv4Addresses = new BlockList();
const blockedTimetableIpv4Subnets = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const;

const blockedTimetableIpv6Addresses = new BlockList();
const blockedTimetableIpv6Subnets = [
  ["::", 96],
  ["::ffff:0:0", 96],
  ["::ffff:0:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const;

for (const [network, prefix] of blockedTimetableIpv4Subnets) {
  blockedTimetableIpv4Addresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of blockedTimetableIpv6Subnets) {
  blockedTimetableIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

export const normalizeTimetableBaseUrlOrThrowBadRequest = (baseUrl: string) => {
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

export const getSavedTimetableBaseUrl = (serializedOptions: string) => {
  try {
    const options = timetableOptionsSchema.parse(parse<unknown>(serializedOptions));
    return normalizeTimetableBaseUrl(options.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
  } catch (cause) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Timetable widget configuration is invalid",
      cause,
    });
  }
};

const normalizeHostname = (hostname: string) => {
  let withoutBrackets = hostname;
  if (hostname.startsWith("[") && hostname.endsWith("]")) withoutBrackets = hostname.slice(1, -1);
  return withoutBrackets.toLowerCase().replace(/\.$/, "");
};

const isBlockedTimetableAddress = (address: string, family: number) => {
  if (family === 6) return blockedTimetableIpv6Addresses.check(address, "ipv6");
  return blockedTimetableIpv4Addresses.check(address, "ipv4");
};

export const resolvePublicTimetableAddressesAsync = async (baseUrl: string): Promise<TimetableResolvedAddress[]> => {
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
    let resolvedAddresses = [{ address: hostname, family: hostnameFamily }];
    if (hostnameFamily === 0) resolvedAddresses = await lookup(hostname, { all: true, verbatim: true });
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

  return addresses.toSorted((left, right) => left.family - right.family || left.address.localeCompare(right.address));
};

const normalizeTimetableOptionsBaseUrlOrThrowBadRequest = (options: Record<string, unknown>) => {
  const parsedOptions = timetableOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid timetable widget options" });
  }
  return normalizeTimetableBaseUrlOrThrowBadRequest(parsedOptions.data.baseUrl ?? DEFAULT_TIMETABLE_BASE_URL);
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
