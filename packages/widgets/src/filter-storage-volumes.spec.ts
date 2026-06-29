import { describe, expect, test } from "vitest";

import { filterStorageVolumes, normalizeStorageDeviceName } from "./filter-storage-volumes";
import { matchFileSystemAndSmart } from "./health-monitoring/system-health";

describe("normalizeStorageDeviceName", () => {
  test("strips partition suffixes from block device paths", () => {
    expect(normalizeStorageDeviceName("/dev/sda1")).toBe("/dev/sda");
    expect(normalizeStorageDeviceName("/dev/sda")).toBe("/dev/sda");
  });

  test("preserves Synology-style volume names", () => {
    expect(normalizeStorageDeviceName("volume_1")).toBe("volume_1");
    expect(normalizeStorageDeviceName("volume_2")).toBe("volume_2");
  });
});

describe("filterStorageVolumes", () => {
  const integrationId = "nas-1";

  test("matches SMART entries using normalized partition identifiers", () => {
    const entries = [
      { deviceName: "/dev/sda1", used: "1", available: "2", percentage: 50 },
      { deviceName: "/dev/sdb1", used: "1", available: "2", percentage: 50 },
    ];
    const smartEntries = [
      { deviceName: "/dev/sda", temperature: 35, overallStatus: "GOOD" },
      { deviceName: "/dev/sdb", temperature: 40, overallStatus: "GOOD" },
    ];

    const visibleVolumes = [`${integrationId}:/dev/sda1`];

    expect(filterStorageVolumes(entries, visibleVolumes, integrationId)).toHaveLength(1);
    expect(filterStorageVolumes(smartEntries, visibleVolumes, integrationId)).toHaveLength(1);
  });

  test("keeps exact Synology volume matches", () => {
    const entries = [{ deviceName: "volume_1" }, { deviceName: "volume_2" }];
    const visibleVolumes = [`${integrationId}:volume_1`];

    expect(filterStorageVolumes(entries, visibleVolumes, integrationId)).toEqual([{ deviceName: "volume_1" }]);
  });
});

describe("matchFileSystemAndSmart", () => {
  test("joins partitioned filesystem entries with base SMART device names", () => {
    const result = matchFileSystemAndSmart(
      [{ deviceName: "/dev/sda1", used: "100", available: "900", percentage: 10 }],
      [{ deviceName: "/dev/sda", temperature: 42, overallStatus: "GOOD" }],
    );

    expect(result).toEqual([
      {
        deviceName: "/dev/sda",
        used: "100",
        available: "900",
        percentage: 10,
        temperature: 42,
        overallStatus: "GOOD",
      },
    ]);
  });

  test("joins Synology volume names without stripping volume suffixes", () => {
    const result = matchFileSystemAndSmart(
      [{ deviceName: "volume_1", used: "100", available: "900", percentage: 10 }],
      [{ deviceName: "volume_1", temperature: 39, overallStatus: "normal" }],
    );

    expect(result[0]).toMatchObject({
      deviceName: "volume_1",
      temperature: 39,
      overallStatus: "normal",
    });
  });
});
