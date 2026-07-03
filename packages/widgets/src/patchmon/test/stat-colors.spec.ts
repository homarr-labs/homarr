import { describe, expect, test } from "vitest";

import type { WidgetComponentProps } from "../../definition";
import { resolveStatColor } from "../stat-colors";

const defaultOptions = {
  enableThresholdColors: true,
  useCustomThresholds: false,
  showTotalHosts: true,
  showHostsNeedingUpdates: true,
  showSecurityUpdates: true,
  showUpToDateHosts: false,
  showHostsWithSecurityUpdates: false,
  showRecentUpdates24h: false,
  showTotalOutdatedPackages: false,
  showTotalRepos: false,
  showOsDistribution: false,
  osDistributionLimit: "0",
  showOsVersion: true,
  hostsNeedingUpdatesThresholdMode: "absolute",
  hostsNeedingUpdatesWarningAt: 1,
  hostsNeedingUpdatesCriticalAt: 5,
  securityUpdatesThresholdMode: "absolute",
  securityUpdatesWarningAt: 1,
  securityUpdatesCriticalAt: 10,
  hostsWithSecurityUpdatesThresholdMode: "absolute",
  hostsWithSecurityUpdatesWarningAt: 1,
  hostsWithSecurityUpdatesCriticalAt: 1,
  upToDateHostsThresholdMode: "percent",
  upToDateHostsWarningAt: 90,
  upToDateHostsCriticalAt: 90,
  totalOutdatedPackagesThresholdMode: "absolute",
  totalOutdatedPackagesWarningAt: 1,
  totalOutdatedPackagesCriticalAt: 50,
  showComplianceHero: true,
  osDisplayMode: "bars",
} satisfies WidgetComponentProps<"patchmon">["options"];

const context = { totalHosts: 100 };

describe("resolveStatColor presets", () => {
  test("hostsNeedingUpdates uses green, yellow, and red boundaries", () => {
    expect(resolveStatColor("hostsNeedingUpdates", 0, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("hostsNeedingUpdates", 1, context, defaultOptions)).toBe("yellow");
    expect(resolveStatColor("hostsNeedingUpdates", 4, context, defaultOptions)).toBe("yellow");
    expect(resolveStatColor("hostsNeedingUpdates", 5, context, defaultOptions)).toBe("red");
  });

  test("securityUpdates uses green and yellow for low counts", () => {
    expect(resolveStatColor("securityUpdates", 0, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("securityUpdates", 1, context, defaultOptions)).toBe("yellow");
    expect(resolveStatColor("securityUpdates", 10, context, defaultOptions)).toBe("red");
  });

  test("hostsWithSecurityUpdates skips yellow", () => {
    expect(resolveStatColor("hostsWithSecurityUpdates", 0, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("hostsWithSecurityUpdates", 1, context, defaultOptions)).toBe("red");
  });

  test("upToDateHosts uses percent of total hosts", () => {
    expect(resolveStatColor("upToDateHosts", 100, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("upToDateHosts", 95, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("upToDateHosts", 90, context, defaultOptions)).toBe("green");
    expect(resolveStatColor("upToDateHosts", 80, context, defaultOptions)).toBe("red");
  });

  test("neutral stats ignore threshold coloring", () => {
    expect(resolveStatColor("totalHosts", 100, context, defaultOptions)).toBe("neutral");
    expect(resolveStatColor("totalRepos", 12, context, defaultOptions)).toBe("neutral");
    expect(resolveStatColor("recentUpdates24h", 34, context, defaultOptions)).toBe("neutral");
  });
});

describe("resolveStatColor options", () => {
  test("returns neutral when threshold colors are disabled", () => {
    expect(
      resolveStatColor("hostsNeedingUpdates", 10, context, {
        ...defaultOptions,
        enableThresholdColors: false,
      }),
    ).toBe("neutral");
  });

  test("supports custom absolute thresholds", () => {
    expect(
      resolveStatColor("hostsNeedingUpdates", 4, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        hostsNeedingUpdatesWarningAt: 5,
        hostsNeedingUpdatesCriticalAt: 10,
      }),
    ).toBe("green");
  });

  test("supports custom percent thresholds for lower-is-better stats", () => {
    expect(
      resolveStatColor("hostsNeedingUpdates", 5, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        hostsNeedingUpdatesThresholdMode: "percent",
        hostsNeedingUpdatesWarningAt: 10,
        hostsNeedingUpdatesCriticalAt: 20,
      }),
    ).toBe("green");

    expect(
      resolveStatColor("hostsNeedingUpdates", 15, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        hostsNeedingUpdatesThresholdMode: "percent",
        hostsNeedingUpdatesWarningAt: 10,
        hostsNeedingUpdatesCriticalAt: 20,
      }),
    ).toBe("yellow");
  });

  test("handles zero total hosts for percent-based stats", () => {
    expect(resolveStatColor("upToDateHosts", 0, { totalHosts: 0 }, defaultOptions)).toBe("green");
    expect(
      resolveStatColor("hostsNeedingUpdates", 1, { totalHosts: 0 }, {
        ...defaultOptions,
        useCustomThresholds: true,
        hostsNeedingUpdatesThresholdMode: "percent",
      }),
    ).toBe("red");
  });

  test("clamps invalid percent thresholds when resolving colors", () => {
    expect(
      resolveStatColor("hostsNeedingUpdates", 50, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        hostsNeedingUpdatesThresholdMode: "percent",
        hostsNeedingUpdatesWarningAt: 40,
        hostsNeedingUpdatesCriticalAt: 200,
      }),
    ).toBe("yellow");
  });

  test("supports custom absolute thresholds for higher-is-better stats", () => {
    expect(
      resolveStatColor("upToDateHosts", 85, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        upToDateHostsThresholdMode: "absolute",
        upToDateHostsWarningAt: 80,
        upToDateHostsCriticalAt: 60,
      }),
    ).toBe("green");

    expect(
      resolveStatColor("upToDateHosts", 70, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        upToDateHostsThresholdMode: "absolute",
        upToDateHostsWarningAt: 80,
        upToDateHostsCriticalAt: 60,
      }),
    ).toBe("yellow");

    expect(
      resolveStatColor("upToDateHosts", 50, context, {
        ...defaultOptions,
        useCustomThresholds: true,
        upToDateHostsThresholdMode: "absolute",
        upToDateHostsWarningAt: 80,
        upToDateHostsCriticalAt: 60,
      }),
    ).toBe("red");
  });
});
