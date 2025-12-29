import JSZip from "jszip";

import type { BackupMetadata, FullBackupData, MediaFile } from "../types";

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

  // Add data files
  zip.file("boards.json", JSON.stringify(data.boards, null, 2));
  zip.file("integrations.json", JSON.stringify(data.integrations, null, 2));
  zip.file("users.json", JSON.stringify(data.users, null, 2));
  zip.file("groups.json", JSON.stringify(data.groups, null, 2));
  zip.file("apps.json", JSON.stringify(data.apps, null, 2));
  zip.file("searchEngines.json", JSON.stringify(data.searchEngines, null, 2));

  if (data.settings) {
    zip.file("settings.json", JSON.stringify(data.settings, null, 2));
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
    boards: boardsFile ? (JSON.parse(await boardsFile.async("string")) as FullBackupData["boards"]) : [],
    integrations: integrationsFile
      ? (JSON.parse(await integrationsFile.async("string")) as FullBackupData["integrations"])
      : [],
    users: usersFile ? (JSON.parse(await usersFile.async("string")) as FullBackupData["users"]) : [],
    groups: groupsFile ? (JSON.parse(await groupsFile.async("string")) as FullBackupData["groups"]) : [],
    apps: appsFile ? (JSON.parse(await appsFile.async("string")) as FullBackupData["apps"]) : [],
    settings: settingsFile ? (JSON.parse(await settingsFile.async("string")) as FullBackupData["settings"]) : null,
    searchEngines: searchEnginesFile
      ? (JSON.parse(await searchEnginesFile.async("string")) as FullBackupData["searchEngines"])
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
