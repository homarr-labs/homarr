import { describe, expect, test } from "vitest";

import {
  filterStorageVolumes,
  normalizeStorageDeviceName,
  toScopedStorageVolumeValue,
} from "./filter-storage-volumes";
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

  test("strips NVMe partition suffixes without collapsing the namespace id", () => {
    expect(normalizeStorageDeviceName("/dev/nvme0n1")).toBe("/dev/nvme0n1");
    expect(normalizeStorageDeviceName("/dev/nvme0n1p2")).toBe("/dev/nvme0n1");
    expect(normalizeStorageDeviceName("/dev/nvme0n2p1")).toBe("/dev/nvme0n2");
  });

  test("does not collapse unrelated md devices", () => {
    expect(normalizeStorageDeviceName("/dev/md0")).toBe("/dev/md0");
    expect(normalizeStorageDeviceName("/dev/md1")).toBe("/dev/md1");
  });
});

describe("toScopedStorageVolumeValue", () => {
  test("scopes unscoped volume names to the query integration", () => {
    expect(toScopedStorageVolumeValue("nas-a", "volume_1")).toBe("nas-a:volume_1");
  });

  test("re-scopes already-prefixed values using the query integration", () => {
    expect(toScopedStorageVolumeValue("nas-b", "nas-a:volume_1")).toBe("nas-b:volume_1");
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

  test("does not apply another integration's scoped selection", () => {
    const entries = [{ deviceName: "volume_1" }, { deviceName: "volume_2" }];
    const visibleVolumes = ["nas-b:volume_1"];

    expect(filterStorageVolumes(entries, visibleVolumes, integrationId)).toEqual([]);
  });

  test("does not treat different md devices as the same volume", () => {
    const entries = [{ deviceName: "/dev/md0" }, { deviceName: "/dev/md1" }];
    const visibleVolumes = [`${integrationId}:/dev/md0`];

    expect(filterStorageVolumes(entries, visibleVolumes, integrationId)).toEqual([{ deviceName: "/dev/md0" }]);
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

  test("joins NVMe partitions with their base device SMART data", () => {
    const result = matchFileSystemAndSmart(
      [{ deviceName: "/dev/nvme0n1p2", used: "100", available: "900", percentage: 10 }],
      [{ deviceName: "/dev/nvme0n1", temperature: 41, overallStatus: "GOOD" }],
    );

    expect(result).toEqual([
      {
        deviceName: "/dev/nvme0n1",
        used: "100",
        available: "900",
        percentage: 10,
        temperature: 41,
        overallStatus: "GOOD",
      },
    ]);
  });

  test("does not join SMART data from a different md device", () => {
    const result = matchFileSystemAndSmart(
      [{ deviceName: "/dev/md0", used: "100", available: "900", percentage: 10 }],
      [{ deviceName: "/dev/md1", temperature: 41, overallStatus: "GOOD" }],
    );

    expect(result[0]).toMatchObject({
      deviceName: "/dev/md0",
      temperature: null,
      overallStatus: "",
    });
  });
});
