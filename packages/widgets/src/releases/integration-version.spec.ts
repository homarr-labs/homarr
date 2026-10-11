import { describe, expect, test } from "vitest";

import { getRowIntegrationVersions, isVersionUpToDate, truncateVersion } from "./integration-version";

describe("isVersionUpToDate", () => {
  test.each([
    { running: "4.0.20.3014", latest: "v4.0.20.3014", expected: true },
    { running: "v1.36.1", latest: "v1.36.1", expected: true },
    { running: "4.0.14.2939", latest: "v4.0.20.3014", expected: false },
    { running: "4.0.20.3013", latest: "v4.0.20.3014", expected: false },
    { running: "4.0.20.3015", latest: "v4.0.20.3014", expected: true },
    { running: "4.0", latest: "v4.0.0", expected: true },
    { running: "4.0.0.1", latest: "v4.0", expected: true },
    { running: "release-2.0", latest: "v1.9.9", expected: true },
  ])("$running against $latest is $expected", ({ running, latest, expected }) => {
    expect(isVersionUpToDate(running, latest)).toBe(expected);
  });

  test.each([
    { running: "4.0.20.3014", latest: "latest" },
    { running: "develop", latest: "v4.0.20.3014" },
    { running: "4.0.20.3014", latest: undefined },
    { running: undefined, latest: "v4.0.20.3014" },
  ])("is unknown for $running against $latest", ({ running, latest }) => {
    expect(isVersionUpToDate(running, latest)).toBeUndefined();
  });
});

describe("truncateVersion", () => {
  test.each([
    { value: "4.0.20.3014", expected: "4.0.20.3014" },
    { value: "12345678901234567890", expected: "12345678901234567890" },
    { value: "2.0.0-develop.20261011", expected: "2.0.0-develop.202…" },
  ])("shows $value as $expected", ({ value, expected }) => {
    expect(truncateVersion(value)).toBe(expected);
  });
});

describe("getRowIntegrationVersions", () => {
  const results = [
    { integrationId: "sonarr", integrationName: "Sonarr", integrationKind: "sonarr" as const, version: "4.0.14.2939" },
    { integrationId: "radarr", integrationName: "Radarr", integrationKind: "radarr" as const, version: "6.4.4.10685" },
    { integrationId: "offline", integrationName: "Offline", integrationKind: "lidarr" as const, version: null },
  ];

  test("returns the row's attached integrations in row order with their status", () => {
    expect(getRowIntegrationVersions(["radarr", "sonarr"], ["sonarr", "radarr"], results, "v6.4.4.10685")).toEqual([
      { id: "radarr", kind: "radarr", name: "Radarr", version: "6.4.4.10685", isUpToDate: true },
      { id: "sonarr", kind: "sonarr", name: "Sonarr", version: "4.0.14.2939", isUpToDate: false },
    ]);
  });

  test("ignores links to integrations no longer attached to the widget", () => {
    expect(getRowIntegrationVersions(["sonarr", "radarr"], ["radarr"], results, "v6.4.4.10685")).toEqual([
      { id: "radarr", kind: "radarr", name: "Radarr", version: "6.4.4.10685", isUpToDate: true },
    ]);
  });

  test("ignores integrations whose version request failed or returned nothing", () => {
    expect(getRowIntegrationVersions(["offline", "unknown"], ["offline", "unknown"], results, "v1.0.0")).toEqual([]);
  });

  test("returns nothing for rows without links", () => {
    expect(getRowIntegrationVersions([], ["sonarr"], results, "v4.0.20.3014")).toEqual([]);
  });
});
