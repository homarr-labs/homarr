import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createId } from "@paralleldrive/cuid2";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { apps, backups, medias, searchEngines, serverSettings } from "@homarr/db/schema";

import { backupEnv } from "../env";
import { BACKUP_FORMAT_VERSION } from "../formats/json-format";
import { createZipArchiveAsync } from "../formats/zip-format";
import type { BackupMetadata, BackupResult, ExportOptions, FullBackupData, MediaFile } from "../types";

/**
 * Gets the backup storage path from environment configuration
 */
const logger = createLogger({ module: "backup" });

const getBackupStoragePath = (): string => {
  return backupEnv.STORAGE_PATH;
};

/**
 * Service for exporting full system backups
 */
export class FullExporter {
  constructor(private readonly db: Database) {}

  /**
   * Creates a full system backup
   */
  async exportAsync(options: ExportOptions = {}): Promise<BackupResult> {
    const backupId = createId();
    const timestamp = new Date();
    const backupName = options.name ?? `homarr-backup-${timestamp.toISOString().split("T")[0]}`;

    logger.info(`Starting backup creation: ${backupName} (id: ${backupId})`);

    // Collect all data
    const data = await this.collectDataAsync();
    logger.debug("Data collection completed");

    // Collect media files
    const mediaFiles = await this.collectMediaFilesAsync();
    logger.debug(`Collected ${mediaFiles.length} media files`);

    // Calculate checksum
    const checksum = this.calculateChecksum(data);
    logger.debug(`Checksum calculated: ${checksum.substring(0, 16)}...`);

    // Create metadata
    const metadata: BackupMetadata = {
      version: BACKUP_FORMAT_VERSION,
      homarrVersion: process.env.VERSION ?? "unknown",
      exportedAt: timestamp.toISOString(),
      exportedBy: options.userId ?? null,
      checksum,
    };

    // Create ZIP archive
    const zipBuffer = await createZipArchiveAsync(metadata, data, mediaFiles);
    logger.debug(`ZIP archive created: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Ensure backup directory exists
    const backupDir = getBackupStoragePath();
    await fs.mkdir(backupDir, { recursive: true });

    // Save to filesystem
    const sanitizedName = backupName.replace(/[^a-zA-Z0-9-_]/g, "-");
    const fileName = `${sanitizedName}-${backupId.slice(0, 8)}.zip`;
    const filePath = path.join(backupDir, fileName);
    await fs.writeFile(filePath, zipBuffer);
    logger.debug(`Backup file saved: ${filePath}`);

    // Save backup record to database
    await this.saveBackupRecordAsync({
      id: backupId,
      name: backupName,
      type: "manual",
      filePath,
      fileSize: zipBuffer.length,
      checksum,
      status: "completed",
      createdBy: options.userId ?? null,
      createdAt: timestamp,
    });

    logger.info(`Backup completed successfully: ${fileName} (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    return {
      id: backupId,
      fileName,
      filePath,
      fileSize: zipBuffer.length,
    };
  }

  /**
   * Collects all data for the backup
   */
  private async collectDataAsync(): Promise<FullBackupData> {
    const [boardsData, integrationsData, usersData, groupsData, appsData, settingsData, searchEnginesData] =
      await Promise.all([
        this.exportBoardsAsync(),
        this.exportIntegrationsAsync(),
        this.exportUsersAsync(),
        this.exportGroupsAsync(),
        this.exportAppsAsync(),
        this.exportSettingsAsync(),
        this.exportSearchEnginesAsync(),
      ]);

    return {
      boards: boardsData,
      integrations: integrationsData,
      users: usersData,
      groups: groupsData,
      apps: appsData,
      settings: settingsData,
      searchEngines: searchEnginesData,
    };
  }

  /**
   * Exports all boards with sections, items, and permissions
   */
  private async exportBoardsAsync() {
    return this.db.query.boards.findMany({
      with: {
        sections: true,
        items: {
          with: {
            integrations: true,
            layouts: true,
          },
        },
        userPermissions: true,
        groupPermissions: true,
        layouts: {
          with: {
            items: true,
            sections: true,
          },
        },
      },
    });
  }

  /**
   * Exports all integrations with secrets (encrypted) and permissions
   */
  private async exportIntegrationsAsync() {
    return this.db.query.integrations.findMany({
      with: {
        secrets: true,
        userPermissions: true,
        groupPermissions: true,
      },
    });
  }

  /**
   * Exports all users with group memberships
   */
  private async exportUsersAsync() {
    return this.db.query.users.findMany({
      with: {
        groups: true,
      },
    });
  }

  /**
   * Exports all groups with permissions
   */
  private async exportGroupsAsync() {
    return this.db.query.groups.findMany({
      with: {
        permissions: true,
        members: true,
      },
    });
  }

  /**
   * Exports all apps
   */
  private async exportAppsAsync() {
    return this.db.select().from(apps);
  }

  /**
   * Exports server settings
   */
  private async exportSettingsAsync() {
    const settings = await this.db.select().from(serverSettings);
    return settings.length > 0 ? settings : null;
  }

  /**
   * Exports all search engines
   */
  private async exportSearchEnginesAsync() {
    return this.db.select().from(searchEngines);
  }

  /**
   * Collects media files from the database
   */
  private async collectMediaFilesAsync(): Promise<MediaFile[]> {
    const mediaRecords = await this.db.select().from(medias);
    return mediaRecords.map((media) => ({
      name: `${media.id}-${media.name}`,
      content: media.content,
    }));
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
   * Saves backup record to database
   */
  private async saveBackupRecordAsync(record: {
    id: string;
    name: string;
    type: "manual" | "auto";
    filePath: string;
    fileSize: number;
    checksum: string;
    status: "completed" | "failed";
    createdBy: string | null;
    createdAt: Date;
  }) {
    await this.db.insert(backups).values(record);
  }
}
