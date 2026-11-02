// @vitest-environment node
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { describe, expect, test } from "vitest";

import {
  extractHost,
  formatEpisodeSubtitle,
  getMediaReleaseTitle,
  groupRecentJellyfinEpisodes,
  parseLocation,
  seriesIdsWithRecentEpisodeBatch,
} from "./jellyfin-integration";

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

  test("uses the episode title when the item name is blank or only repeats the series", () => {
    expect(
      formatEpisodeSubtitle({
        Type: "Episode",
        Name: "  ",
        EpisodeTitle: "A Different Corner",
        SeriesName: "MobLand",
        ParentIndexNumber: 2,
        IndexNumber: 6,
      }),
    ).toBe("S02E06 – A Different Corner");
    expect(
      formatEpisodeSubtitle({
        Type: "Episode",
        Name: "MobLand",
        EpisodeTitle: "A Different Corner",
        SeriesName: "MobLand",
        ParentIndexNumber: 2,
        IndexNumber: 6,
      }),
    ).toBe("S02E06 – A Different Corner");
  });
});

const seriesItem = { Id: "series-1", Type: "Series" as const, Name: "MobLand" };
const seriesById = new Map<string, BaseItemDto>([["series-1", seriesItem]]);

const episode = (id: string, dateCreated: string | undefined, name: string): BaseItemDto => ({
  Id: id,
  Type: "Episode",
  SeriesId: "series-1",
  SeriesName: "MobLand",
  Name: name,
  DateCreated: dateCreated,
  ParentIndexNumber: 2,
  IndexNumber: id === "recent" ? 6 : 1,
});

describe("groupRecentJellyfinEpisodes", () => {
  test("keeps a single new episode when older episodes of the series are also in the list", () => {
    const recent = episode("recent", "2026-10-20T18:00:00.000Z", "A Different Corner");
    const older = episode("older", "2026-09-01T18:00:00.000Z", "Pilot");
    const items = groupRecentJellyfinEpisodes([recent, older], seriesById);

    expect(seriesIdsWithRecentEpisodeBatch([recent, older])).toEqual([]);
    expect(items).toEqual([recent]);
    expect(groupRecentJellyfinEpisodes([older, recent], seriesById)).toEqual([recent]);
    expect(items.map((item) => [getMediaReleaseTitle(item), formatEpisodeSubtitle(item)])).toEqual([
      ["MobLand", "S02E06 – A Different Corner"],
    ]);
  });

  test("groups episodes added within a day into the series", () => {
    const first = episode("recent", "2026-10-20T18:00:00.000Z", "One");
    const second = episode("second", "2026-10-20T01:00:00.000Z", "Two");
    const movie = { Id: "movie-1", Type: "Movie" as const, Name: "Mars Express" };

    expect(seriesIdsWithRecentEpisodeBatch([first, movie, second])).toEqual(["series-1"]);
    expect(groupRecentJellyfinEpisodes([first, movie, second], seriesById)).toEqual([seriesItem, movie]);
  });

  test("keeps an episode added just outside the day-long batch window", () => {
    const recent = episode("recent", "2026-10-20T18:00:00.000Z", "A Different Corner");
    const boundary = episode("boundary", "2026-10-19T18:00:00.000Z", "Included");
    const outside = episode("outside", "2026-10-19T17:59:59.000Z", "Excluded");

    expect(groupRecentJellyfinEpisodes([recent, boundary], seriesById)).toEqual([seriesItem]);
    expect(groupRecentJellyfinEpisodes([recent, outside], seriesById)).toEqual([recent]);
  });

  test("keeps the episodes when the series cannot be loaded", () => {
    const first = episode("recent", "2026-10-20T18:00:00.000Z", "One");
    const second = episode("second", "2026-10-20T01:00:00.000Z", "Two");

    expect(groupRecentJellyfinEpisodes([first, second], new Map())).toEqual([first, second]);
  });

  test("leaves movies and episodes without a series id untouched", () => {
    const movie = { Id: "movie-1", Type: "Movie" as const, Name: "Mars Express" };
    const loose = { Id: "loose", Type: "Episode" as const, Name: "Special" };

    expect(groupRecentJellyfinEpisodes([movie, loose], seriesById)).toEqual([movie, loose]);
  });
});
