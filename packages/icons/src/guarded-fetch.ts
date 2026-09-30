import { lookup } from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { BlockList, isIP } from "node:net";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
type Dispatcher = Awaited<ReturnType<typeof createCertificateAgentAsync>>;

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

interface GuardedFetchOptions {
  headers?: Record<string, string>;
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

const isBlockedAddress = ({ address, family }: ResolvedAddress) => {
  if (family === 4) return blockedAddresses.check(address, "ipv4");
  if (blockedAddresses.check(address, "ipv6")) return true;
  const embedded = embeddedIpv4(address);
  return embedded !== null && blockedAddresses.check(embedded, "ipv4");
};

// A lookup cannot be cancelled, so one that never answers is abandoned instead.
const untilAbortedAsync = <T>(promise: Promise<T>, signal: AbortSignal) =>
  new Promise<T>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });

const resolveAllowedAddressesAsync = async (url: URL, signal: AbortSignal): Promise<ResolvedAddress[]> => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Refusing to request ${url.protocol} url ${url.href}`);
  }

  const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1");
  const literalFamily = isIP(hostname);
  const resolved =
    literalFamily === 0
      ? await untilAbortedAsync(lookup(hostname, { all: true, verbatim: true }), signal)
      : [{ address: hostname, family: literalFamily }];
  const addresses = resolved.filter((entry): entry is ResolvedAddress => entry.family === 4 || entry.family === 6);

  if (addresses.length === 0) throw new Error(`${url.hostname} did not resolve to an address`);
  const blocked = addresses.find(isBlockedAddress);
  if (blocked !== undefined) {
    throw new Error(`Refusing to request ${url.href} because it resolves to ${blocked.address}`);
  }

  return addresses;
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
    },
  );

const requestHopAsync = async (
  url: URL,
  options: GuardedFetchOptions,
): Promise<{ response: FetchResponse; dispatcher: Dispatcher }> => {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new Error(`Request to ${url.href} timed out`)), options.timeout);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;

  try {
    const addresses = await resolveAllowedAddressesAsync(url, signal);
    const dispatcher = await createPinnedDispatcherAsync(addresses, options.timeout);
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

  for (let redirects = 0; ; redirects++) {
    options.signal?.throwIfAborted();
    const { response, dispatcher } = await requestHopAsync(currentUrl, options);

    try {
      const location = redirectStatuses.has(response.status) ? response.headers.get("location") : null;
      if (location === null) return await handleResponse(response, currentUrl);

      await cancelBodyAsync(response);
      if (redirects === maximumRedirects) throw new Error(`Too many redirects starting at ${url.href}`);
      currentUrl = new URL(location, currentUrl);
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
