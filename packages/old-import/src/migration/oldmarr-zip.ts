import AdmZip from "adm-zip"; // TODO: add dependency to package.json

import { logger } from "@homarr/log";
import { oldmarrConfigSchema } from "@homarr/old-schema";
import { z } from "@homarr/validation";

import { oldmarrChecksumSchema } from "./schemas/checksum";
import type { OldmarrExportSettings } from "./schemas/export";
import { oldmarrExportSettingsSchema } from "./schemas/export";
import { oldmarrImportCredentialsUserSchema } from "./schemas/users";

/**
 * Extracts the data from the oldmarr migration zip archive.
 * @param file migration zip file.
 * @returns extracted data.
 */
export const extractOldmarrMigrationZipAsync = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new AdmZip(Buffer.from(arrayBuffer));

  const exportSettings = extractExportConfiguration(zip);

  return {
    credentialUsers: extractCredentialUsers(zip, exportSettings),
    configurations: extractConfigurations(zip),
    checksum: extractChecksum(zip, exportSettings),
    exportSettings: exportSettings,
  };
};

/**
 * Extracts the export configuration from the zip archive.
 * Configuration is used to determine which data was exported and should be imported.
 * @param zip AdmZip instance.
 * @returns export configuration.
 */
const extractExportConfiguration = (zip: AdmZip) => {
  const exportConfigContent = readFileContentOrThrow(zip, "export/settings.json");
  return oldmarrExportSettingsSchema.parse(JSON.parse(exportConfigContent));
};

/**
 * Extracts the credential users from the zip archive.
 * Only credential users are exported as there was no field for
 * provider beside username and password for credential users.
 * @param zip AdmZip instance.
 * @param exportConfiguration export configuration.
 * @returns credential users or null if not exported.
 */
const extractCredentialUsers = (zip: AdmZip, exportConfiguration: OldmarrExportSettings) => {
  if (!exportConfiguration.users) return null;
  const usersContent = readFileContentOrThrow(zip, "users/users.json");
  return z.array(oldmarrImportCredentialsUserSchema).parse(JSON.parse(usersContent));
};

/**
 * Extracts the board configurations from the zip archive.
 * Invalid configurations are logged and ignored.
 * @param zip AdmZip instance.
 * @returns board configurations.
 */
const extractConfigurations = (zip: AdmZip) => {
  const configurationEntries = zip
    .getEntries()
    // Board configurations are stored in the root of the zip archive.
    .filter((entry) => entry.entryName.endsWith(".json") && !entry.entryName.includes("/"));

  return configurationEntries
    .map((entry) => {
      const content = entry.getData().toString("utf8");
      const result = oldmarrConfigSchema.safeParse(JSON.parse(content));
      if (!result.success) {
        logger.error(`Error parsing board configuration ${entry.entryName}: ${result.error.toString()}`);
        return null;
      }

      return result.data;
    })
    .filter((result) => result !== null);
};

/**
 * Extracts the checksum from the zip archive.
 * Checksum is used to validate the provided token.
 * File is only required when either users or integrations were exported.
 * @param zip AdmZip instance.
 * @param exportConfiguration export configuration.
 * @returns checksum or null if not exported.
 * @throws Error if checksum has invalid format.
 */
const extractChecksum = (zip: AdmZip, exportConfiguration: OldmarrExportSettings) => {
  if (!exportConfiguration.users && !exportConfiguration.integrations) return null;
  const checksumContent = readFileContentOrThrow(zip, "checksum.txt");
  const checksumParts = checksumContent.split("\n");
  const result = oldmarrChecksumSchema.safeParse(checksumParts);
  if (!result.success) throw new Error(`Error parsing checksum: ${result.error.toString()}`);
  return result.data;
};

/**
 * Tries to read the file from the zip archive.
 * @param zip AdmZip instance.
 * @param path path to file in the zip archive.
 * @returns file content.
 * @throws Error if the file is not found.
 */
const readFileContentOrThrow = (zip: AdmZip, path: string) => {
  const file = zip.getEntry(path)?.getData().toString("utf8");
  if (!file) throw new Error(`File not found: ${path}`);
  return file;
};
