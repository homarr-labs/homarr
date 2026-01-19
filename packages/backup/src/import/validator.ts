import crypto from "crypto";
import JSZip from "jszip";

import { isVersionCompatible } from "../formats/json-format";
import type { BackupMetadata, BackupSummary, FullBackupData, ValidationResult } from "../types";

/**
 * Service for validating backup files before import
 */
export class BackupValidator {
  /**
   * Validates a backup file
   * @param fileContent Base64 encoded ZIP file content
   */
  async validateAsync(fileContent: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Decode base64 to buffer
      const buffer = Buffer.from(fileContent, "base64");

      // Load ZIP
      const zip = await JSZip.loadAsync(buffer);

      // Check required files
      const requiredFiles = ["metadata.json", "boards.json", "users.json"];
      for (const file of requiredFiles) {
        if (!zip.file(file)) {
          errors.push(`Missing required file: ${file}`);
        }
      }

      if (errors.length > 0) {
        return {
          valid: false,
          errors,
          warnings,
          summary: this.emptySummary(),
        };
      }

      // Parse metadata
      const metadataFile = zip.file("metadata.json");
      if (!metadataFile) {
        errors.push("Missing metadata.json file");
        return {
          valid: false,
          errors,
          warnings,
          summary: this.emptySummary(),
        };
      }
      const metadataRaw = await metadataFile.async("string");
      const metadata = JSON.parse(metadataRaw) as BackupMetadata;

      // Check version compatibility
      if (!isVersionCompatible(metadata.version)) {
        errors.push(`Incompatible backup version: ${metadata.version}. Expected version 1.x.x`);
      }

      // Parse data files
      const data = await this.parseDataFilesAsync(zip);

      // Calculate and verify checksum
      const calculatedChecksum = this.calculateChecksum(data);
      if (calculatedChecksum !== metadata.checksum) {
        warnings.push("Checksum mismatch - backup may have been modified or corrupted");
      }

      // Count media files
      const mediaFolder = zip.folder("media");
      const mediaFilesCount = mediaFolder
        ? Object.keys(mediaFolder.files).filter((name) => !name.endsWith("/")).length
        : 0;

      const summary: BackupSummary = {
        boards: data.boards.length,
        integrations: data.integrations.length,
        users: data.users.length,
        groups: data.groups.length,
        apps: data.apps.length,
        mediaFiles: mediaFilesCount,
        searchEngines: data.searchEngines.length,
      };

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary,
        metadata,
      };
    } catch (error) {
      errors.push(`Failed to parse backup: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        valid: false,
        errors,
        warnings,
        summary: this.emptySummary(),
      };
    }
  }

  /**
   * Parses all data files from the ZIP
   */
  private async parseDataFilesAsync(zip: JSZip): Promise<FullBackupData> {
    const boardsFile = zip.file("boards.json");
    const integrationsFile = zip.file("integrations.json");
    const usersFile = zip.file("users.json");
    const groupsFile = zip.file("groups.json");
    const appsFile = zip.file("apps.json");
    const settingsFile = zip.file("settings.json");
    const searchEnginesFile = zip.file("searchEngines.json");

    return {
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
  }

  /**
   * Calculates SHA-256 checksum of the data
   */
  private calculateChecksum(data: FullBackupData): string {
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(data));
    return hash.digest("hex");
  }

  /**
   * Returns an empty summary object
   */
  private emptySummary(): BackupSummary {
    return {
      boards: 0,
      integrations: 0,
      users: 0,
      groups: 0,
      apps: 0,
      mediaFiles: 0,
      searchEngines: 0,
    };
  }
}
