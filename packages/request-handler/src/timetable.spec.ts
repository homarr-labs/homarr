import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { timetableGetTimetableRequestHandler, timetableSearchStationsRequestHandler } from "./timetable";
import { normalizeTimetableBaseUrl, readBoundedTimetableJsonAsync } from "./timetable-url";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

beforeEach(() => vi.clearAllMocks());

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
