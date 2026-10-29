import { lookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { BlockList, isIP } from "node:net";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "./request";

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
type Dispatcher = Awaited<ReturnType<typeof createCertificateAgentAsync>>;

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

interface GuardedFetchOptions {
  headers?: Record<string, string>;
  // Only server-registered integrations may trust their configured origin. Website
  // metadata and page-declared icons must never set this exception.
  trustedOrigin?: string;
  // Page-declared icons are fetched again for anyone who can load the board. Private
  // networks are refused for those fetches. "off-origin" still allows the first hop —
  // the app the user named, which often lives on the LAN — and refuses private
  // addresses once a redirect leaves that origin.
  blockPrivateNetworks?: boolean | "off-origin";
  // Bounds the lookup, the connect and the response headers of every hop, and how long
  // the body may stay idle.
  timeout: number;
  // Aborts the whole exchange, redirects and body included.
  signal?: AbortSignal;
}

const maximumRedirects = 5;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

// Loopback, link-local, unspecified, multicast and reserved addresses, plus the cloud
// metadata services that live outside link-local. Private networks stay reachable,
// Homarr's own container address and its Docker gateway included, because self hosted
// apps run there. Node matches the IPv4 rules against IPv4-mapped IPv6 addresses as well.
const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["100.100.100.200", 32],
  ["168.63.129.16", 32],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 96],
  ["fe80::", 10],
  ["fd00:ec2::254", 128],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

// Addresses that are not loopback or metadata, but are still not the public internet.
// Untrusted icons must not be fetched from here: the image proxy is unauthenticated.
const privateAddresses = new BlockList();
for (const [network, prefix] of [
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  privateAddresses.addSubnet(network, prefix, "ipv4");
}
privateAddresses.addSubnet("fc00::", 7, "ipv6");

const parseIpv6Groups = (part: string) =>
  part === ""
    ? []
    : part.split(":").flatMap((group) => {
        if (!group.includes(".")) return [parseInt(group, 16)];
        const [a = 0, b = 0, c = 0, d = 0] = group.split(".").map(Number);
        return [(a << 8) | b, (c << 8) | d];
      });

const expandIpv6 = (address: string) => {
  const [head = "", tail] = address.split("::");
  const start = parseIpv6Groups(head);
  if (tail === undefined) return start;
  const end = parseIpv6Groups(tail);
  return [...start, ...Array<number>(8 - start.length - end.length).fill(0), ...end];
};

const toIpv4 = (high: number, low: number) => `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

// A NAT64 or 6to4 gateway connects to the IPv4 address carried inside these addresses.
const embeddedIpv4 = (address: string) => {
  const groups = expandIpv6(address);
  const [first, second, third, , , , seventh = 0, eighth = 0] = groups;
  if (first === 0x64 && second === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) {
    return toIpv4(seventh, eighth);
  }
  if (first === 0x2002 && second !== undefined && third !== undefined) return toIpv4(second, third);
  return null;
};

const matchesAddressList = (list: BlockList, { address, family }: ResolvedAddress) => {
  if (family === 4) return list.check(address, "ipv4");
  if (list.check(address, "ipv6")) return true;
  const embedded = embeddedIpv4(address);
  return embedded !== null && list.check(embedded, "ipv4");
};

const isBlockedAddress = (resolved: ResolvedAddress) => matchesAddressList(blockedAddresses, resolved);
const isPrivateAddress = (resolved: ResolvedAddress) => matchesAddressList(privateAddresses, resolved);

// Hostnames are not decided here; they are resolved by isNonPublicHttpTargetAsync.
export const isLiteralNonPublicAddress = (hostname: string): boolean => {
  const address = hostname.replace(/^\[(.*)\]$/, "$1");
  const family = isIP(address);
  if (family !== 4 && family !== 6) return false;
  const resolved: ResolvedAddress = { address, family: family === 6 ? 6 : 4 };
  return isBlockedAddress(resolved) || isPrivateAddress(resolved);
};

// A lookup cannot be cancelled, so one that never answers is abandoned instead.
const untilAbortedAsync = <T>(promise: Promise<T>, signal: AbortSignal) =>
  new Promise<T>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });

const resolveAllowedAddressesAsync = async (
  url: URL,
  signal: AbortSignal,
  blockPrivateNetworks: boolean,
): Promise<ResolvedAddress[]> => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Refusing to request a ${url.protocol} url`);
  }

  const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1");
  const literalFamily = isIP(hostname);
  const resolved =
    literalFamily === 0
      ? await untilAbortedAsync(lookup(hostname, { all: true, verbatim: true }), signal)
      : [{ address: hostname, family: literalFamily }];
  const addresses = resolved.filter((entry): entry is ResolvedAddress => entry.family === 4 || entry.family === 6);

  if (addresses.length === 0) throw new Error(`${url.hostname} did not resolve to an address`);
  const blocked = addresses.find(
    (address) => isBlockedAddress(address) || (blockPrivateNetworks && isPrivateAddress(address)),
  );
  if (blocked !== undefined) {
    throw new Error(`Refusing to request ${url.origin} because it resolves to ${blocked.address}`);
  }

  return addresses;
};

// True when this url must not be fetched for an untrusted icon: a non-http url, or an
// address that is loopback, link-local, private, or otherwise not the public internet.
export const isNonPublicHttpTargetAsync = async (url: URL, signal: AbortSignal): Promise<boolean> => {
  try {
    await resolveAllowedAddressesAsync(url, signal, true);
    return false;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Refusing")) return true;
    throw error;
  }
};

// Answers every lookup of the connection with the addresses that were checked, so a DNS
// record that changes between the check and the connect cannot redirect the request.
const createPinnedLookup =
  (addresses: ResolvedAddress[]): LookupFunction =>
  (_hostname, options, callback) => {
    const candidates =
      options.family === 4 || options.family === 6
        ? addresses.filter(({ family }) => family === options.family)
        : addresses;
    const selected = candidates[0];
    if (selected === undefined) {
      const error: NodeJS.ErrnoException = new Error("No checked address for the requested family");
      error.code = "ENOTFOUND";
      callback(error, []);
      return;
    }

    if (options.all) callback(null, candidates);
    else callback(null, selected.address, selected.family);
  };

// A proxy resolves the target on its own, which would bypass the pinned lookup.
const createPinnedDispatcherAsync = async (addresses: ResolvedAddress[], timeout: number) =>
  await createCertificateAgentAsync(
    { lookup: createPinnedLookup(addresses) },
    {
      autoSelectFamily: addresses.length > 1,
      bodyTimeout: timeout,
      httpProxy: "",
      httpsProxy: "",
      noProxy: "*",
      logOriginOnly: true,
    },
  );

const requestHopAsync = async (
  url: URL,
  options: GuardedFetchOptions,
): Promise<{ response: FetchResponse; dispatcher: Dispatcher }> => {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new Error(`Request to ${url.origin} timed out`)), options.timeout);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;

  try {
    const dispatcher =
      options.trustedOrigin === url.origin && (url.protocol === "http:" || url.protocol === "https:")
        ? await createCertificateAgentAsync(undefined, { bodyTimeout: options.timeout, logOriginOnly: true })
        : await createPinnedDispatcherAsync(
            await resolveAllowedAddressesAsync(url, signal, options.blockPrivateNetworks === true),
            options.timeout,
          );
    try {
      const response = await fetchWithTrustedCertificatesAsync(url, {
        headers: options.headers,
        redirect: "manual",
        dispatcher,
        signal,
      });
      return { response, dispatcher };
    } catch (error) {
      await dispatcher.destroy();
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }
};

/**
 * fetchGuardedAsync requests a user provided url without letting it reach loopback,
 * link-local, multicast or cloud metadata addresses, following up to five redirects
 * and checking every hop again.
 *
 * The final response is handed to handleResponse together with its url, and the
 * connection is closed once that callback settles.
 */
export const fetchGuardedAsync = async <TResult>(
  url: URL,
  options: GuardedFetchOptions,
  handleResponse: (response: FetchResponse, url: URL) => Promise<TResult>,
): Promise<TResult> => {
  let currentUrl = url;
  let currentOptions = options;

  for (let redirects = 0; ; redirects++) {
    options.signal?.throwIfAborted();
    const { response, dispatcher } = await requestHopAsync(currentUrl, currentOptions);

    try {
      const location = redirectStatuses.has(response.status) ? response.headers.get("location") : null;
      if (location === null) return await handleResponse(response, currentUrl);

      await cancelBodyAsync(response);
      if (redirects === maximumRedirects) throw new Error(`Too many redirects starting at ${url.origin}`);
      // The TypeError of new URL carries the full location and base, query strings included.
      const target = URL.parse(location, currentUrl);
      if (target === null) throw new Error(`Invalid redirect location from ${currentUrl.origin}`);
      // undici refuses a url with credentials and puts all of it, query included, into its error.
      target.username = "";
      target.password = "";
      // Custom integration headers can contain credentials too. Once a redirect
      // leaves the origin, neither credentials nor its trust exception may follow.
      if (target.origin !== currentUrl.origin) {
        currentOptions = {
          ...currentOptions,
          headers: undefined,
          trustedOrigin: undefined,
          blockPrivateNetworks:
            currentOptions.blockPrivateNetworks === "off-origin" ? true : currentOptions.blockPrivateNetworks,
        };
      }
      currentUrl = target;
    } finally {
      await dispatcher.destroy();
    }
  }
};

export const cancelBodyAsync = async (response: FetchResponse): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // The connection is already gone, so there is nothing left to release
  }
};
