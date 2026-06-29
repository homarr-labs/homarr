interface StorageVolumeEntry {
  deviceName: string;
}

const matchesVisibleStorageVolume = (
  visibleVolume: string,
  integrationId: string,
  deviceName: string,
): boolean => {
  const separatorIndex = visibleVolume.indexOf(":");
  if (separatorIndex === -1) {
    return visibleVolume === deviceName;
  }

  const visibleIntegrationId = visibleVolume.slice(0, separatorIndex);
  const visibleVolumeName = visibleVolume.slice(separatorIndex + 1);
  return visibleIntegrationId === integrationId && visibleVolumeName === deviceName;
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
