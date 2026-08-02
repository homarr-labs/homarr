import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { timetableGetTimetableRequestHandler, timetableSearchStationsRequestHandler } from "./timetable";
import { normalizeTimetableBaseUrl, readBoundedTimetableJsonAsync } from "./timetable-url";

vi.mock("@homarr/core/infrastructure/http", () => ({
  createCertificateAgentAsync: vi.fn(),
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const mockCreateCertificateAgent = vi.mocked(createCertificateAgentAsync);
const mockCloseDispatcher = vi.fn();
const mockDispatcher = { close: mockCloseDispatcher };

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateCertificateAgent.mockResolvedValue(mockDispatcher as never);
});

describe("normalizeTimetableBaseUrl", () => {
  it("normalizes an HTTP endpoint", () => {
    expect(normalizeTimetableBaseUrl("https://search.ch/")).toBe("https://search.ch");
  });

  it.each(["file:///etc/passwd", "https://user:secret@example.com", "https://example.com?redirect=/admin"])(
    "rejects unsafe base URL %s",
    (url) => expect(() => normalizeTimetableBaseUrl(url)).toThrow(),
  );
});

describe("timetable response bounds", () => {
  it("rejects a response once its byte budget is exceeded", async () => {
    const response = new Response(JSON.stringify({ value: "x".repeat(100) }));
    await expect(readBoundedTimetableJsonAsync(response, 32)).rejects.toThrow("exceeds 32 bytes");
  });

  it("caps and caches station results and rejects redirects", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify(
          Array.from({ length: 125 }, (_, index) => ({
            id: String(index),
            label: `Station ${index}`,
            iconclass: "train",
          })),
        ),
      ),
    );
    const input = { baseUrl: "http://timetable.internal", query: "bounded-stations" };

    const first = await timetableSearchStationsRequestHandler.handler(input).getDataAsync();
    const second = await timetableSearchStationsRequestHandler.handler(input).getDataAsync();

    expect(first.data).toHaveLength(100);
    expect(second.data).toHaveLength(100);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "error", bodyTimeout: 10_000 }),
    );
  });

  it("pins the vetted address into a direct connection without changing the request hostname", async () => {
    const pinnedAddresses = [
      { address: "93.184.216.34", family: 4 as const },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 as const },
    ];
    mockFetch.mockImplementation(async () => {
      const pinnedLookup = mockCreateCertificateAgent.mock.calls[0]?.[0]?.lookup;
      expect(pinnedLookup).toBeTypeOf("function");
      if (!pinnedLookup) throw new Error("Expected a pinned lookup function");

      const lookupCallback = vi.fn();
      pinnedLookup("timetable.example.com", { all: true }, lookupCallback);
      expect(lookupCallback).toHaveBeenCalledWith(null, pinnedAddresses);

      const repeatedLookupCallback = vi.fn();
      pinnedLookup("timetable.example.com", { all: true }, repeatedLookupCallback);
      expect(repeatedLookupCallback).toHaveBeenCalledWith(null, pinnedAddresses);
      expect(mockCloseDispatcher).not.toHaveBeenCalled();

      const unexpectedHostCallback = vi.fn();
      pinnedLookup("different.example.com", { all: true }, unexpectedHostCallback);
      expect(unexpectedHostCallback.mock.calls[0]?.[0]).toMatchObject({ code: "ENOTFOUND" });

      return new Response(JSON.stringify([{ id: "station", label: "Station", iconclass: "train" }]));
    });

    await timetableSearchStationsRequestHandler
      .handler({
        baseUrl: "https://timetable.example.com",
        query: "pinned-stations",
        pinnedAddresses,
      })
      .getDataAsync();

    expect(mockCreateCertificateAgent).toHaveBeenCalledWith(
      { lookup: expect.any(Function) },
      {
        autoSelectFamily: true,
        bodyTimeout: 10_000,
        httpProxy: "",
        httpsProxy: "",
        noProxy: "*",
      },
    );
    const requestUrl = mockFetch.mock.calls[0]?.[0];
    expect(new URL(String(requestUrl)).hostname).toBe("timetable.example.com");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dispatcher: mockDispatcher, redirect: "error" }),
    );

    expect(mockCloseDispatcher).toHaveBeenCalledOnce();
  });

  it("pins timetable requests and closes their direct dispatcher", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          connections: [
            {
              time: "2026-01-01T00:00:00Z",
              line: "1",
              color: "ffffff",
              terminal: { name: "Stop" },
              dep_delay: "0",
            },
          ],
        }),
      ),
    );
    const pinnedAddresses = [{ address: "93.184.216.34", family: 4 as const }];

    await timetableGetTimetableRequestHandler
      .handler({
        baseUrl: "https://timetable.example.com",
        stationId: "pinned-departures",
        limit: 1,
        pinnedAddresses,
      })
      .getDataAsync();

    expect(mockCreateCertificateAgent).toHaveBeenCalledWith(
      { lookup: expect.any(Function) },
      expect.objectContaining({ noProxy: "*" }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dispatcher: mockDispatcher, redirect: "error" }),
    );
    expect(mockCloseDispatcher).toHaveBeenCalledOnce();
  });

  it("never caches more departures than requested", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          connections: Array.from({ length: 5 }, (_, index) => ({
            time: `2026-01-01T00:0${index}:00Z`,
            line: "1",
            color: "ffffff",
            terminal: { name: `Stop ${index}` },
            dep_delay: "0",
          })),
        }),
      ),
    );

    const result = await timetableGetTimetableRequestHandler
      .handler({ baseUrl: "http://timetable.internal", stationId: "bounded-departures", limit: 2 })
      .getDataAsync();

    expect(result.data.entries).toHaveLength(2);
  });
});
