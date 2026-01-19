import JSZip from "jszip";

import type { BackupMetadata, FullBackupData, MediaFile } from "../types";

/**
 * Wrapper for data files with Homarr version
 */
interface VersionedData<T> {
  homarrVersion: string;
  data: T;
}

/**
 * Helper to wrap data with version
 */
const wrapData = <T>(homarrVersion: string, itemData: T): VersionedData<T> => ({
  homarrVersion,
  data: itemData,
});

/**
 * Helper to unwrap data, supporting both versioned and legacy formats
 */
const unwrapData = <T>(content: string): T => {
  const parsed = JSON.parse(content) as Record<string, unknown> | VersionedData<unknown>;
  // Check if data is in versioned format (has homarrVersion and data fields)
  if (typeof parsed === "object" && "homarrVersion" in parsed && "data" in parsed) {
    return (parsed as VersionedData<T>).data;
  }
  // Legacy format: return as-is
  return parsed as T;
};

/**
 * Creates a ZIP archive buffer from backup data and media files
 */
export const createZipArchiveAsync = async (
  metadata: BackupMetadata,
  data: FullBackupData,
  mediaFiles: MediaFile[],
): Promise<Buffer> => {
  const zip = new JSZip();

  // Add metadata
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  // Add data files with version wrapper
  zip.file("boards.json", JSON.stringify(wrapData(metadata.homarrVersion, data.boards), null, 2));
  zip.file("integrations.json", JSON.stringify(wrapData(metadata.homarrVersion, data.integrations), null, 2));
  zip.file("users.json", JSON.stringify(wrapData(metadata.homarrVersion, data.users), null, 2));
  zip.file("groups.json", JSON.stringify(wrapData(metadata.homarrVersion, data.groups), null, 2));
  zip.file("apps.json", JSON.stringify(wrapData(metadata.homarrVersion, data.apps), null, 2));
  zip.file("searchEngines.json", JSON.stringify(wrapData(metadata.homarrVersion, data.searchEngines), null, 2));

  if (data.settings) {
    zip.file("settings.json", JSON.stringify(wrapData(metadata.homarrVersion, data.settings), null, 2));
  }

  // Add media files to media folder
  const mediaFolder = zip.folder("media");
  if (mediaFolder) {
    for (const file of mediaFiles) {
      mediaFolder.file(file.name, file.content);
    }
  }

  // Generate the ZIP as a Node.js Buffer
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
};

/**
 * Extracts data from a ZIP archive buffer
 */
export const extractZipArchiveAsync = async (
  buffer: Buffer,
): Promise<{
  metadata: BackupMetadata;
  data: FullBackupData;
  mediaFolder: JSZip | null;
}> => {
  const zip = await JSZip.loadAsync(buffer);

  // Parse metadata
  const metadataFile = zip.file("metadata.json");
  if (!metadataFile) {
    throw new Error("Missing metadata.json in backup archive");
  }
  const metadata = JSON.parse(await metadataFile.async("string")) as BackupMetadata;

  // Parse data files
  const boardsFile = zip.file("boards.json");
  const integrationsFile = zip.file("integrations.json");
  const usersFile = zip.file("users.json");
  const groupsFile = zip.file("groups.json");
  const appsFile = zip.file("apps.json");
  const settingsFile = zip.file("settings.json");
  const searchEnginesFile = zip.file("searchEngines.json");

  const data: FullBackupData = {
    boards: boardsFile ? unwrapData<FullBackupData["boards"]>(await boardsFile.async("string")) : [],
    integrations: integrationsFile
      ? unwrapData<FullBackupData["integrations"]>(await integrationsFile.async("string"))
      : [],
    users: usersFile ? unwrapData<FullBackupData["users"]>(await usersFile.async("string")) : [],
    groups: groupsFile ? unwrapData<FullBackupData["groups"]>(await groupsFile.async("string")) : [],
    apps: appsFile ? unwrapData<FullBackupData["apps"]>(await appsFile.async("string")) : [],
    settings: settingsFile ? unwrapData<FullBackupData["settings"]>(await settingsFile.async("string")) : null,
    searchEngines: searchEnginesFile
      ? unwrapData<FullBackupData["searchEngines"]>(await searchEnginesFile.async("string"))
      : [],
  };

  // Get media folder
  const mediaFolder = zip.folder("media");

  return { metadata, data, mediaFolder };
};

/**
 * Gets the list of files in the media folder of a ZIP archive
 */
export const getMediaFilesFromZipAsync = async (zip: JSZip): Promise<Map<string, Buffer>> => {
  const mediaFiles = new Map<string, Buffer>();
  const mediaFolder = zip.folder("media");

  if (mediaFolder) {
    const files = mediaFolder.filter((_, file) => !file.dir);
    for (const file of files) {
      const content = await file.async("nodebuffer");
      const fileName = file.name.replace("media/", "");
      mediaFiles.set(fileName, content);
    }
  }

  return mediaFiles;
};
