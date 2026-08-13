import { describe, expect, it } from "vitest";

import { isHttpUrl, resolveDiscoveredAppUrl, takeNewSourceIds } from "./discovery-selection";

describe("takeNewSourceIds", () => {
  it("keeps same-kind service instances independent and does not reselect them after refresh", () => {
    const seen = new Set<string>();
    const sonarrInstances = ["docker:host:sonarr-hd", "docker:host:sonarr-4k"];

    expect(takeNewSourceIds(sonarrInstances, seen)).toEqual(sonarrInstances);
    expect(takeNewSourceIds(sonarrInstances, seen)).toEqual([]);
  });

  it("keeps an explicit app URL and falls back through discovery and server-derived addresses", () => {
    expect(resolveDiscoveredAppUrl("https://manual.example", "https://label.example", "http://host:3000")).toBe(
      "https://manual.example",
    );
    expect(resolveDiscoveredAppUrl(undefined, "https://label.example", "http://host:3000")).toBe(
      "https://label.example",
    );
    expect(resolveDiscoveredAppUrl(undefined, null, "http://host:3000")).toBe("http://host:3000");
    expect(resolveDiscoveredAppUrl(undefined, null, null)).toBe("");
  });

  it("accepts only HTTP and HTTPS service addresses", () => {
    expect(isHttpUrl("http://home.lan:8989")).toBe(true);
    expect(isHttpUrl("https://home.example/sonarr")).toBe(true);
    expect(isHttpUrl("home.lan:8989")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
