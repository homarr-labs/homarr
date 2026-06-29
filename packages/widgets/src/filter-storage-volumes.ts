interface StorageVolumeEntry {
  deviceName: string;
}

const partitionSuffixPatterns: ReadonlyArray<{ pattern: RegExp; baseGroupIndex: number }> = [
  // SCSI/SATA/VirtIO: /dev/sda1 -> /dev/sda
  { pattern: /^(\/dev\/(?:sd|vd|hd|xvd)[a-z]+)[0-9]+$/, baseGroupIndex: 1 },
  // NVMe: /dev/nvme0n1p2 -> /dev/nvme0n1
  { pattern: /^(\/dev\/nvme[0-9]+n[0-9]+)p[0-9]+$/, baseGroupIndex: 1 },
  // eMMC: /dev/mmcblk0p1 -> /dev/mmcblk0
  { pattern: /^(\/dev\/mmcblk[0-9]+)p[0-9]+$/, baseGroupIndex: 1 },
];

export const normalizeStorageDeviceName = (deviceName: string): string => {
  for (const { pattern, baseGroupIndex } of partitionSuffixPatterns) {
    const match = deviceName.match(pattern);
    if (match) {
      return match[baseGroupIndex] ?? deviceName;
    }
  }

  return deviceName;
};

export const toScopedStorageVolumeValue = (integrationId: string, value: string): string => {
  const separatorIndex = value.indexOf(":");
  const volumeName = separatorIndex === -1 ? value : value.slice(separatorIndex + 1);
  return `${integrationId}:${volumeName}`;
};

const storageDeviceNamesMatch = (leftDeviceName: string, rightDeviceName: string): boolean => {
  return (
    leftDeviceName === rightDeviceName ||
    normalizeStorageDeviceName(leftDeviceName) === normalizeStorageDeviceName(rightDeviceName)
  );
};

const matchesVisibleStorageVolume = (
  visibleVolume: string,
  integrationId: string,
  deviceName: string,
): boolean => {
  const separatorIndex = visibleVolume.indexOf(":");
  if (separatorIndex === -1) {
    return storageDeviceNamesMatch(visibleVolume, deviceName);
  }

  const visibleIntegrationId = visibleVolume.slice(0, separatorIndex);
  const visibleVolumeName = visibleVolume.slice(separatorIndex + 1);
  return visibleIntegrationId === integrationId && storageDeviceNamesMatch(visibleVolumeName, deviceName);
};

export const filterStorageVolumes = <TEntry extends StorageVolumeEntry>(
  entries: TEntry[],
  visibleStorageVolumes: string[] | undefined,
  integrationId: string,
): TEntry[] => {
  if (!visibleStorageVolumes || visibleStorageVolumes.length === 0) {
    return entries;
  }

  return entries.filter((entry) =>
    visibleStorageVolumes.some((visibleVolume) =>
      matchesVisibleStorageVolume(visibleVolume, integrationId, entry.deviceName),
    ),
  );
};
