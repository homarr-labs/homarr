import { describe, expect, it } from "vitest";

import { isHttpUrl, normalizeServiceUrl, resolveDiscoveredAppUrl, takeNewSourceIds } from "./discovery-selection";

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

  it("normalizes HTTP, HTTPS, and bare self-hosted service addresses", () => {
    expect(isHttpUrl("http://home.lan:8989")).toBe(true);
    expect(isHttpUrl("https://home.example/sonarr")).toBe(true);
    expect(normalizeServiceUrl("home.lan:8989")).toBe("http://home.lan:8989");
    expect(normalizeServiceUrl("0.0.0.0:8989")).toBe("http://0.0.0.0:8989");
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
  });
});
