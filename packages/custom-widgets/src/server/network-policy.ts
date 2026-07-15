import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { Agent } from "undici";

import type { CustomJsxNetworkScope } from "../core";
import { CustomWidgetDomainError } from "./errors";
import { MAX_RESPONSE_BODY_BYTES } from "./response";

const RESERVED_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
]);

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["100.64.0.0", 10],
  ["169.254.0.0", 16],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
blocked.addAddress("::", "ipv6");
for (const [address, prefix] of [
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(address, prefix, "ipv6");
}
blocked.addAddress("fd00:ec2::254", "ipv6");

const privateAddresses = new BlockList();
privateAddresses.addSubnet("10.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("172.16.0.0", 12, "ipv4");
privateAddresses.addSubnet("192.168.0.0", 16, "ipv4");
privateAddresses.addSubnet("fc00::", 7, "ipv6");
const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet("127.0.0.0", 8, "ipv4");
loopbackAddresses.addAddress("::1", "ipv6");

type AddressFamily = 4 | 6;
export type ResolvedAddress = { address: string; family: AddressFamily };
type AddressClass = "public" | "private" | "loopback" | "blocked";
const normalizeHostname = (value: string) =>
  value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
const familyName = (family: AddressFamily) => (family === 4 ? "ipv4" : "ipv6");

export function classifyAddress(address: string): AddressClass {
  const normalized = normalizeHostname(address).toLowerCase();
  const family = isIP(normalized) as AddressFamily | 0;
  if (!family || normalized.includes("::ffff:") || blocked.check(normalized, familyName(family))) return "blocked";
  if (loopbackAddresses.check(normalized, familyName(family))) return "loopback";
  if (privateAddresses.check(normalized, familyName(family))) return "private";
  return "public";
}

export async function resolveAndValidateHost(
  hostname: string,
  scope: CustomJsxNetworkScope,
): Promise<ResolvedAddress[]> {
  const normalized = normalizeHostname(hostname);
  const family = isIP(normalized) as AddressFamily | 0;
  const addresses = family
    ? [{ address: normalized, family }]
    : ((await lookup(normalized, { all: true, verbatim: true })) as ResolvedAddress[]);
  if (!addresses.length)
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Target host did not resolve" });
  for (const address of addresses) {
    const classification = classifyAddress(address.address);
    const allowed =
      classification === "public" ||
      (classification === "private" && scope !== "public") ||
      (classification === "loopback" && scope === "loopback");
    if (!allowed)
      throw new CustomWidgetDomainError({
        code: "FORBIDDEN",
        message: `Target address is not allowed by the ${scope} network scope`,
      });
  }
  return addresses;
}

export function validateCustomWidgetUrl(value: string | URL): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Invalid custom widget URL" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Only HTTP and HTTPS URLs are allowed" });
  if (url.username || url.password)
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "URL credentials are not allowed" });
  if (url.hash) throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "URL fragments are not allowed" });
  return url;
}

export function resolveSameOriginTarget(baseValue: string, targetValue?: string | URL): URL {
  const base = validateCustomWidgetUrl(baseValue);
  const target = validateCustomWidgetUrl(targetValue ?? base);
  if (target.origin !== base.origin)
    throw new CustomWidgetDomainError({
      code: "FORBIDDEN",
      message: "Named requests must stay on the widget's origin",
    });
  return target;
}

export function assertSafeStaticHeaders(headers: Record<string, string> | undefined): void {
  for (const name of Object.keys(headers ?? {})) {
    const value = name.trim().toLowerCase();
    if (
      RESERVED_HEADERS.has(value) ||
      value.startsWith("proxy-") ||
      value.startsWith("sec-") ||
      value.startsWith("x-forwarded-")
    ) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: `Header '${name}' is reserved` });
    }
  }
}

export function createPinnedAgent(addresses: ResolvedAddress[], timeoutMs: number) {
  const customLookup: LookupFunction = (_hostname, options, callback) => {
    const family = options.family === 4 || options.family === 6 ? options.family : undefined;
    const candidates = family ? addresses.filter((entry) => entry.family === family) : addresses;
    const selected = candidates[0];
    if (!selected) {
      const error = new Error("No validated address for the requested family") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error, "", 0);
    } else if (options.all) callback(null, candidates);
    else callback(null, selected.address, selected.family);
  };
  return new Agent({
    connect: { lookup: customLookup },
    connectTimeout: timeoutMs,
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
    maxResponseSize: MAX_RESPONSE_BODY_BYTES,
  });
}
