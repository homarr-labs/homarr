interface StorageVolumeEntry {
  deviceName: string;
}

export const filterStorageVolumes = <TEntry extends StorageVolumeEntry>(
  entries: TEntry[],
  visibleStorageVolumes: string[] | undefined,
): TEntry[] => {
  if (!visibleStorageVolumes || visibleStorageVolumes.length === 0) {
    return entries;
  }

  const visibleVolumeSet = new Set(visibleStorageVolumes);
  return entries.filter((entry) => visibleVolumeSet.has(entry.deviceName));
};
