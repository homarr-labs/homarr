import { describe, expect, test } from "vitest";

import {
  getFailedServiceVersionIntegrations,
  getRowIntegrationVersions,
  isVersionUpToDate,
  truncateVersion,
} from "./integration-version";

describe("isVersionUpToDate", () => {
  test.each([
    { running: "4.0.20.3014", latest: "v4.0.20.3014", expected: true },
    { running: "v1.36.1", latest: "v1.36.1", expected: true },
    { running: "4.0.14.2939", latest: "v4.0.20.3014", expected: false },
    { running: "4.0.20.3013", latest: "v4.0.20.3014", expected: false },
    { running: "4.0.20.3015", latest: "v4.0.20.3014", expected: true },
    { running: "4.0", latest: "v4.0.0", expected: true },
    { running: "4.0.0.1", latest: "v4.0", expected: true },
    { running: "4.0.20.3014", latest: "4.0.20.3014-ls325", expected: true },
    { running: "4.0.20.3014", latest: "4.0.21.3020-ls330", expected: false },
    { running: "2026.10.1", latest: "2026.10.2", expected: false },
    { running: "2026.11.0", latest: "2026.10.2", expected: true },
    { running: "20261011", latest: "20261012", expected: false },
    { running: "2026.10", latest: "2026.10.1", expected: false },
    { running: "2026.10.1", latest: "2026.10", expected: true },
  ])("$running against $latest is $expected", ({ running, latest, expected }) => {
    expect(isVersionUpToDate(running, latest)).toBe(expected);
  });

  test.each([
    { running: "4.0.20.3014", latest: "latest" },
    { running: "develop", latest: "v4.0.20.3014" },
    { running: "release-2.0", latest: "v1.9.9" },
    { running: "4.0.20.3014", latest: "amd64-4.0.20.3014" },
    { running: "4.0.20.3014", latest: "arm64v8-4.0.21" },
    { running: "4.0.20.3014", latest: "sha256:9f86d081884c7d65" },
    { running: "4.0.20.3014", latest: "v5.0.0-beta.1" },
    { running: "4.0.20.3014", latest: "2026.10.11" },
    { running: "4.0.20.3014", latest: "20261011" },
    { running: "2026.10.1", latest: "v4.0.20" },
    { running: "2026.10.11", latest: "20261011" },
    { running: "20261011", latest: "2026.10.11" },
    { running: "4..20", latest: "v4.0.20" },
    { running: "4.0.x", latest: "v4.0.20" },
    { running: "1.2.3abc", latest: "v1.2.3" },
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

describe("getFailedServiceVersionIntegrations", () => {
  const healthy = {
    integrationId: "sonarr",
    integrationName: "Sonarr",
    integrationKind: "sonarr" as const,
    version: "4.0.20.3014",
  };
  const failed = {
    integrationId: "radarr",
    integrationName: "Radarr",
    integrationKind: "radarr" as const,
    version: null,
    error: "INTEGRATION_REQUEST_FAILED",
  };
  const totalFailure = { integrationId: "service-versions", integrationName: "Running Versions", error: "failed" };

  test("returns nothing when every integration responded", () => {
    expect(getFailedServiceVersionIntegrations({ data: [healthy], error: null }, "Running Versions")).toEqual([]);
  });

  test("lists the integrations whose request failed", () => {
    expect(getFailedServiceVersionIntegrations({ data: [healthy, failed], error: null }, "Running Versions")).toEqual([
      { integrationId: "radarr", integrationName: "Radarr", error: "INTEGRATION_REQUEST_FAILED" },
    ]);
  });

  test("reports a total failure before any versions were fetched", () => {
    expect(
      getFailedServiceVersionIntegrations({ data: undefined, error: new Error("All failed") }, "Running Versions"),
    ).toEqual([totalFailure]);
  });

  test("reports a total failure while cached versions from an earlier fetch remain", () => {
    expect(
      getFailedServiceVersionIntegrations({ data: [healthy], error: new Error("All failed") }, "Running Versions"),
    ).toEqual([totalFailure]);
  });

  test("ignores permission errors", () => {
    expect(
      getFailedServiceVersionIntegrations(
        { data: undefined, error: { data: { code: "FORBIDDEN" } } },
        "Running Versions",
      ),
    ).toEqual([]);
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
