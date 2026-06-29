interface StorageVolumeEntry {
  deviceName: string;
}

export const normalizeStorageDeviceName = (deviceName: string): string => {
  return deviceName.replace(/(?<=[a-zA-Z])[0-9]+$/, "");
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
