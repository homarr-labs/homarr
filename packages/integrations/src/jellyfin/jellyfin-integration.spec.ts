import { describe, expect, test } from "vitest";

import { extractHost, formatEpisodeSubtitle, getMediaReleaseTitle, parseLocation } from "./jellyfin-integration";

describe("extractHost", () => {
  test("strips the port from an IPv4 endpoint", () => {
    expect(extractHost("192.168.1.100:54321")).toBe("192.168.1.100");
  });

  test("returns an IPv4 address unchanged when there's no port", () => {
    expect(extractHost("8.8.8.8")).toBe("8.8.8.8");
  });

  test("strips brackets and the port from a bracketed IPv6 endpoint", () => {
    expect(extractHost("[::1]:8096")).toBe("::1");
  });

  test("returns a bare IPv6 address unchanged when there's no port", () => {
    expect(extractHost("::1")).toBe("::1");
  });
});

describe("parseLocation", () => {
  test("returns null when there's no endpoint to classify", () => {
    expect(parseLocation(null)).toBeNull();
    expect(parseLocation(undefined)).toBeNull();
    expect(parseLocation("")).toBeNull();
  });

  test("returns null for a value that isn't an IP", () => {
    expect(parseLocation("not-an-ip:1234")).toBeNull();
  });

  test("classifies private IPv4 ranges as lan", () => {
    expect(parseLocation("192.168.1.100:54321")).toBe("lan");
    expect(parseLocation("10.0.0.5:1234")).toBe("lan");
    expect(parseLocation("172.16.5.5:1234")).toBe("lan");
    expect(parseLocation("127.0.0.1:8096")).toBe("lan");
  });

  test("classifies a public IPv4 address as wan", () => {
    expect(parseLocation("8.8.8.8:1234")).toBe("wan");
  });

  test("classifies IPv6 loopback and unique-local addresses as lan", () => {
    expect(parseLocation("[::1]:8096")).toBe("lan");
    expect(parseLocation("[fd12:3456:789a::1]:8096")).toBe("lan");
  });

  test("classifies a public IPv6 address as wan", () => {
    expect(parseLocation("[2606:4700:4700::1111]:8096")).toBe("wan");
  });

  test("unwraps an IPv4-mapped IPv6 address before classifying it", () => {
    expect(parseLocation("[::ffff:192.168.1.5]:8096")).toBe("lan");
    expect(parseLocation("[::ffff:8.8.8.8]:8096")).toBe("wan");
  });

  test("classifies link-local addresses as lan", () => {
    // Link-local traffic can't traverse a router, so it's always LAN even though
    // it isn't a private range in the traditional (RFC 1918 / ULA) sense.
    expect(parseLocation("169.254.1.5:8096")).toBe("lan");
    expect(parseLocation("[fe80::1]:8096")).toBe("lan");
  });
});

describe("getMediaReleaseTitle", () => {
  test("uses the series name as the title of an episode", () => {
    expect(getMediaReleaseTitle({ Type: "Episode", Name: "Ozymandias", SeriesName: "Breaking Bad" })).toBe(
      "Breaking Bad",
    );
  });

  test("falls back to the item name when the series name is missing", () => {
    expect(getMediaReleaseTitle({ Type: "Episode", Name: "Ozymandias" })).toBe("Ozymandias");
  });

  test("uses the item name for other media types", () => {
    expect(getMediaReleaseTitle({ Type: "Movie", Name: "Inception" })).toBe("Inception");
  });
});

describe("formatEpisodeSubtitle", () => {
  test("combines the season and episode number with the episode name", () => {
    expect(
      formatEpisodeSubtitle({
        Type: "Episode",
        Name: "Ozymandias",
        SeriesName: "Breaking Bad",
        ParentIndexNumber: 5,
        IndexNumber: 14,
      }),
    ).toBe("S05E14 – Ozymandias");
  });

  test("pads season and episode numbers to two digits", () => {
    expect(
      formatEpisodeSubtitle({
        Type: "Episode",
        Name: "Pilot",
        SeriesName: "Breaking Bad",
        ParentIndexNumber: 1,
        IndexNumber: 3,
      }),
    ).toBe("S01E03 – Pilot");
  });

  test("falls back to the episode name when the numbers are missing", () => {
    expect(formatEpisodeSubtitle({ Type: "Episode", Name: "Pilot", SeriesName: "Breaking Bad" })).toBe("Pilot");
  });

  test("keeps the tagline when the series name is missing", () => {
    expect(formatEpisodeSubtitle({ Type: "Episode", Name: "Pilot", Taglines: ["A tagline"] })).toBe("A tagline");
  });
});
