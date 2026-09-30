// @vitest-environment node
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { fetchGuardedAsync } from "../guarded-fetch";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("@homarr/core/infrastructure/http", () => ({
  createCertificateAgentAsync: vi.fn(),
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
type Dispatcher = Awaited<ReturnType<typeof createCertificateAgentAsync>>;

const mockedLookup = vi.mocked(lookup as unknown as (hostname: string) => Promise<LookupAddress[]>);
const mockedCreateAgent = vi.mocked(createCertificateAgentAsync);
const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createResponse = (status: number, location?: string): FetchResponse =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => (name.toLowerCase() === "location" ? (location ?? null) : null) },
    body: { cancel: () => Promise.resolve() },
  }) as unknown as FetchResponse;

const mockDns = (addressesByHostname: Record<string, string[]>) => {
  mockedLookup.mockImplementation((hostname) => {
    const addresses = addressesByHostname[hostname];
    if (addresses === undefined) return Promise.reject(new Error(`getaddrinfo ENOTFOUND ${hostname}`));
    return Promise.resolve(addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
  });
};

const mockResponses = (responsesByUrl: Record<string, FetchResponse>) => {
  mockedFetch.mockImplementation((input) => {
    const url = input instanceof URL ? input.href : String(input);
    const response = responsesByUrl[url];
    return response === undefined
      ? Promise.reject(new Error(`Unexpected request to ${url}`))
      : Promise.resolve(response);
  });
};

const requestedUrls = () => mockedFetch.mock.calls.map(([input]) => String(input));

const pinnedLookupOfRequest = (index: number): LookupFunction => {
  const lookupFunction = mockedCreateAgent.mock.calls[index]?.[0]?.lookup;
  if (lookupFunction === undefined) throw new Error(`Request ${index} was not given a pinned lookup`);
  return lookupFunction;
};

const lookupThroughPinnedAsync = (pinnedLookup: LookupFunction, hostname: string) =>
  new Promise<string>((resolve, reject) => {
    pinnedLookup(hostname, {}, (error, address) => (error ? reject(error) : resolve(address as string)));
  });

const fetchStatusAsync = (url: string, signal?: AbortSignal) =>
  fetchGuardedAsync(new URL(url), { timeout: 1_000, signal }, (response, finalUrl) =>
    Promise.resolve({ status: response.status, url: finalUrl.href }),
  );

const never = <T>() => new Promise<T>(() => undefined);

describe("fetchGuardedAsync", () => {
  beforeEach(() => {
    mockedLookup.mockReset();
    mockedFetch.mockReset();
    mockedCreateAgent.mockReset();
    mockedCreateAgent.mockImplementation(() =>
      Promise.resolve({ destroy: () => Promise.resolve() } as unknown as Dispatcher),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.each([
    ["ipv4 loopback", "http://127.0.0.1/"],
    ["the far end of the ipv4 loopback range", "http://127.255.0.9/"],
    ["ipv4 loopback written as a single number", "http://2130706433/"],
    ["ipv6 loopback", "http://[::1]/"],
    ["the unspecified ipv4 address", "http://0.0.0.0/"],
    ["the this-network range", "http://0.1.2.3/"],
    ["the unspecified ipv6 address", "http://[::]/"],
    ["the cloud metadata service", "http://169.254.169.254/latest/meta-data/"],
    ["ipv4 link-local", "http://169.254.10.20/"],
    ["ipv6 link-local", "http://[fe80::1]/"],
    ["the ipv6 metadata service of aws", "http://[fd00:ec2::254]/"],
    ["the metadata service of alibaba cloud", "http://100.100.100.200/"],
    ["the wireserver of azure", "http://168.63.129.16/"],
    ["ipv4 multicast", "http://224.0.0.251/"],
    ["ipv6 multicast", "http://[ff02::1]/"],
    ["the ipv4 broadcast address", "http://255.255.255.255/"],
    ["ipv4-mapped loopback", "http://[::ffff:127.0.0.1]/"],
    ["ipv4-mapped metadata service", "http://[::ffff:169.254.169.254]/"],
    ["ipv4-mapped wireserver of azure", "http://[::ffff:168.63.129.16]/"],
    ["ipv4-mapped unspecified address", "http://[::ffff:0.0.0.0]/"],
    ["ipv4-mapped multicast", "http://[::ffff:224.0.0.1]/"],
    ["ipv4-mapped loopback in full notation", "http://[0:0:0:0:0:ffff:7f00:1]/"],
    ["loopback behind nat64", "http://[64:ff9b::7f00:1]/"],
    ["the metadata service behind nat64", "http://[64:ff9b::a9fe:a9fe]/"],
    ["loopback behind 6to4", "http://[2002:7f00:1::]/"],
    ["the metadata service behind 6to4", "http://[2002:a9fe:a9fe::1]/"],
  ])("refuses %s without sending a request", async (_name, url) => {
    await expect(fetchStatusAsync(url)).rejects.toThrow(/Refusing/);

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test.each([
    ["a class c private address", "http://192.168.1.10/", "192.168.1.10"],
    ["a class a private address", "http://10.0.0.5/", "10.0.0.5"],
    ["a class b private address", "http://172.16.3.4/", "172.16.3.4"],
    ["a carrier grade nat address", "http://100.64.1.2/", "100.64.1.2"],
    ["an ipv6 unique local address", "http://[fd12:3456::1]/", "fd12:3456::1"],
    ["an ipv4-mapped private address", "http://[::ffff:c0a8:10a]/", "::ffff:c0a8:10a"],
    ["a public address", "https://93.184.216.34/", "93.184.216.34"],
    ["a public address behind nat64", "http://[64:ff9b::5db8:d822]/", "64:ff9b::5db8:d822"],
    ["a public address behind 6to4", "http://[2002:5db8:d822::1]/", "2002:5db8:d822::1"],
  ])("allows %s", async (_name, url, address) => {
    mockResponses({ [url]: createResponse(200) });

    await expect(fetchStatusAsync(url)).resolves.toEqual({ status: 200, url });
    await expect(lookupThroughPinnedAsync(pinnedLookupOfRequest(0), "ignored")).resolves.toBe(address);
  });

  test("allows a hostname in the local network and connects to the address it resolved to", async () => {
    mockDns({ "nas.lan": ["192.168.1.20"] });
    mockResponses({ "http://nas.lan:5000/": createResponse(200) });

    await expect(fetchStatusAsync("http://nas.lan:5000/")).resolves.toEqual({
      status: 200,
      url: "http://nas.lan:5000/",
    });
    await expect(lookupThroughPinnedAsync(pinnedLookupOfRequest(0), "nas.lan")).resolves.toBe("192.168.1.20");
  });

  test("refuses a hostname that resolves to a blocked address", async () => {
    mockDns({ "evil.example.com": ["127.0.0.1"] });

    await expect(fetchStatusAsync("http://evil.example.com/")).rejects.toThrow(/Refusing/);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("refuses a hostname when any of its addresses is blocked", async () => {
    mockDns({ "mixed.example.com": ["93.184.216.34", "169.254.169.254"] });

    await expect(fetchStatusAsync("http://mixed.example.com/")).rejects.toThrow(/169\.254\.169\.254/);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("keeps connecting to the checked address when the hostname starts resolving to a blocked one", async () => {
    mockDns({ "rebind.example.com": ["192.168.1.30"] });
    mockResponses({ "http://rebind.example.com/": createResponse(200) });

    await fetchStatusAsync("http://rebind.example.com/");
    mockDns({ "rebind.example.com": ["127.0.0.1"] });

    const pinnedLookup = pinnedLookupOfRequest(0);
    await expect(lookupThroughPinnedAsync(pinnedLookup, "rebind.example.com")).resolves.toBe("192.168.1.30");
    await expect(lookupThroughPinnedAsync(pinnedLookup, "rebind.example.com")).resolves.toBe("192.168.1.30");
    expect(mockedLookup).toHaveBeenCalledTimes(1);
  });

  test("answers only with checked addresses of the requested family", async () => {
    mockDns({ "dual.example.com": ["93.184.216.34", "2606:2800:220:1::1"] });
    mockResponses({ "http://dual.example.com/": createResponse(200) });

    await fetchStatusAsync("http://dual.example.com/");

    const pinnedLookup = pinnedLookupOfRequest(0);
    const addressesOf = (family: number) =>
      new Promise<unknown>((resolve) => {
        pinnedLookup("dual.example.com", { family, all: true }, (_error, addresses) => resolve(addresses));
      });
    await expect(addressesOf(6)).resolves.toEqual([{ address: "2606:2800:220:1::1", family: 6 }]);
    await expect(addressesOf(4)).resolves.toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  test("connects directly, follows redirects by hand and bounds the body", async () => {
    mockResponses({ "http://192.168.1.10/": createResponse(200) });

    await fetchStatusAsync("http://192.168.1.10/");

    expect(mockedCreateAgent.mock.calls[0]?.[1]).toMatchObject({
      bodyTimeout: 1_000,
      httpProxy: "",
      httpsProxy: "",
      noProxy: "*",
    });
    expect(mockedFetch.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual", signal: expect.any(AbortSignal) });
    expect(mockedFetch.mock.calls[0]?.[1]?.dispatcher).toBe(await mockedCreateAgent.mock.results[0]?.value);
  });

  test("gives up on a hostname whose lookup never answers", async () => {
    vi.useFakeTimers();
    mockedLookup.mockImplementation(never);

    let settled = false;
    const request = fetchStatusAsync("http://slow-dns.example.com/").finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    const assertion = expect(request).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("gives up on a server that never sends its response headers", async () => {
    vi.useFakeTimers();
    mockedFetch.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );

    const assertion = expect(fetchStatusAsync("http://192.168.1.10/")).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  test("sends no further request once the caller aborted", async () => {
    const controller = new AbortController();
    mockedFetch.mockImplementation(() => {
      controller.abort(new Error("caller gave up"));
      return Promise.resolve(createResponse(302, "/next"));
    });

    await expect(fetchStatusAsync("http://192.168.1.10/", controller.signal)).rejects.toThrow(/caller gave up/);
    expect(requestedUrls()).toEqual(["http://192.168.1.10/"]);
  });

  test("follows a redirect and checks the new target again", async () => {
    mockDns({ "app.example.com": ["93.184.216.34"], "login.example.com": ["192.168.1.40"] });
    mockResponses({
      "http://app.example.com/": createResponse(302, "http://login.example.com/sign-in"),
      "http://login.example.com/sign-in": createResponse(200),
    });

    await expect(fetchStatusAsync("http://app.example.com/")).resolves.toEqual({
      status: 200,
      url: "http://login.example.com/sign-in",
    });
    expect(mockedLookup).toHaveBeenCalledWith("login.example.com", expect.anything());
    await expect(lookupThroughPinnedAsync(pinnedLookupOfRequest(1), "login.example.com")).resolves.toBe("192.168.1.40");
  });

  test("refuses a redirect to a blocked address", async () => {
    mockResponses({ "http://192.168.1.10/": createResponse(301, "http://169.254.169.254/latest/meta-data/") });

    await expect(fetchStatusAsync("http://192.168.1.10/")).rejects.toThrow(/Refusing/);
    expect(requestedUrls()).toEqual(["http://192.168.1.10/"]);
  });

  test("refuses a redirect to a hostname that resolves to a blocked address", async () => {
    mockDns({ localhost: ["127.0.0.1", "::1"] });
    mockResponses({ "http://192.168.1.10/": createResponse(307, "http://localhost:8080/admin") });

    await expect(fetchStatusAsync("http://192.168.1.10/")).rejects.toThrow(/Refusing/);
    expect(requestedUrls()).toEqual(["http://192.168.1.10/"]);
  });

  test("refuses a redirect to another protocol", async () => {
    mockResponses({ "http://192.168.1.10/": createResponse(302, "file:///etc/passwd") });

    await expect(fetchStatusAsync("http://192.168.1.10/")).rejects.toThrow(/Refusing/);
    expect(requestedUrls()).toEqual(["http://192.168.1.10/"]);
  });

  test("follows five redirects", async () => {
    const hops = Array.from({ length: 6 }, (_, index) => `http://192.168.1.10/${index}`);
    mockResponses({
      ...Object.fromEntries(hops.slice(0, 5).map((hop, index) => [hop, createResponse(302, `/${index + 1}`)])),
      [hops[5] as string]: createResponse(200),
    });

    await expect(fetchStatusAsync(hops[0] as string)).resolves.toEqual({ status: 200, url: hops[5] });
    expect(requestedUrls()).toEqual(hops);
  });

  test("gives up after more than five redirects", async () => {
    const hops = Array.from({ length: 7 }, (_, index) => `http://192.168.1.10/${index}`);
    mockResponses(Object.fromEntries(hops.map((hop, index) => [hop, createResponse(302, `/${index + 1}`)])));

    await expect(fetchStatusAsync(hops[0] as string)).rejects.toThrow(/Too many redirects/);
    expect(requestedUrls()).toEqual(hops.slice(0, 6));
  });

  test("gives up on a redirect loop", async () => {
    mockResponses({
      "http://192.168.1.10/a": createResponse(302, "/b"),
      "http://192.168.1.10/b": createResponse(302, "/a"),
    });

    await expect(fetchStatusAsync("http://192.168.1.10/a")).rejects.toThrow(/Too many redirects/);
    expect(mockedFetch).toHaveBeenCalledTimes(6);
  });

  test("closes the connection of every hop", async () => {
    const destroy = vi.fn(() => Promise.resolve());
    mockedCreateAgent.mockImplementation(() => Promise.resolve({ destroy } as unknown as Dispatcher));
    mockResponses({
      "http://192.168.1.10/": createResponse(302, "/next"),
      "http://192.168.1.10/next": createResponse(200),
    });

    await fetchStatusAsync("http://192.168.1.10/");

    expect(destroy).toHaveBeenCalledTimes(2);
  });
});
