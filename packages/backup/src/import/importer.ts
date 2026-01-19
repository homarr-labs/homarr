import { createId } from "@paralleldrive/cuid2";
import type JSZip from "jszip";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import {
  apps,
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrationItems,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
  itemLayouts,
  items,
  layouts,
  medias,
  onboarding,
  searchEngines,
  sectionLayouts,
  sections,
  serverSettings,
  sessions,
  users,
} from "@homarr/db/schema";
import { credentialsAdminGroup, everyoneGroup } from "@homarr/definitions";

import { isVersionCompatible, parseEntityExport } from "../formats/json-format";
import { extractZipArchiveAsync } from "../formats/zip-format";
import type { BoardImportResult, BoardMergeResult, ImportedCounts, ImportOptions, ImportResult } from "../types";
import { BackupValidator } from "./validator";

const logger = createLogger({ module: "backup" });

/**
 * Service for importing backup files
 */
export class BackupImporter {
  private readonly validator = new BackupValidator();

  constructor(private readonly db: Database) {}

  /**
   * Imports a backup file
   * @param fileContent Base64 encoded ZIP file content
   * @param options Import options
   */
  async importAsync(fileContent: string, options: ImportOptions): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const imported = this.emptyImportedCounts();
    const skipped = this.emptyImportedCounts();

    logger.info(`Starting backup import in ${options.mode} mode`);

    try {
      // First validate the backup
      const validationResult = await this.validator.validateAsync(fileContent);
      if (!validationResult.valid) {
        logger.warn("Backup validation failed", { errors: validationResult.errors });
        return {
          success: false,
          imported,
          skipped,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          hasAdminUser: true, // Not relevant for validation failure, assume true to avoid redirect
        };
      }

      logger.debug("Backup validation passed");

      // Decode and extract ZIP
      const buffer = Buffer.from(fileContent, "base64");
      const { data, mediaFolder } = await extractZipArchiveAsync(buffer);

      // Full mode: clear existing data first
      if (options.mode === "full") {
        logger.info("Full restore mode: clearing existing data");
        await this.clearAllDataAsync();
        logger.debug("Existing data cleared");
      }

      // Import in correct order (dependencies first)
      const importSteps = [
        { key: "apps", singular: "app", fn: this.importAppAsync.bind(this) },
        { key: "groups", singular: "group", fn: this.importGroupAsync.bind(this) },
        { key: "users", singular: "user", fn: this.importUserAsync.bind(this) },
        { key: "integrations", singular: "integration", fn: this.importIntegrationAsync.bind(this) },
        { key: "searchEngines", singular: "search engine", fn: this.importSearchEngineAsync.bind(this) },
        { key: "boards", singular: "board", fn: this.importBoardAsync.bind(this) },
      ] as const;

      for (const step of importSteps) {
        const result = await this.importItemsAsync(
          data[step.key] as Record<string, unknown>[],
          step.fn,
          options.mode,
          step.singular,
        );
        imported[step.key] = result.importedCount;
        skipped[step.key] = result.skippedCount;
        errors.push(...result.errors);
      }

      // 6.5. Update home boards for users and groups (now that boards exist)
      try {
        await this.updateHomeBoardsAsync(
          data.users as Record<string, unknown>[],
          data.groups as Record<string, unknown>[],
        );
      } catch (error) {
        warnings.push(`Failed to update home boards: ${String(error)}`);
      }

      // 7. Settings (only in full mode)
      if (data.settings && options.mode === "full") {
        try {
          await this.importSettingsAsync(data.settings);
        } catch (error) {
          errors.push(`Failed to import settings: ${String(error)}`);
        }
      }

      // 8. Media files
      if (mediaFolder) {
        try {
          imported.mediaFiles = await this.importMediaFilesAsync(mediaFolder);
        } catch (error) {
          warnings.push(`Failed to import some media files: ${String(error)}`);
        }
      }

      // 9. Ensure "everyone" group exists (create if backup didn't contain it)
      await this.ensureEveryoneGroupExistsAsync();

      // Check if admin user exists after import
      const hasAdminUser = await this.hasAdminUserAsync();

      logger.info("Import completed", {
        success: errors.length === 0,
        imported,
        skipped,
        errorCount: errors.length,
        hasAdminUser,
      });

      return {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        warnings,
        hasAdminUser,
      };
    } catch (error) {
      logger.error("Import failed with unexpected error", { error: String(error) });
      errors.push(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);

      // Try to check admin status even after error (data may be partially imported)
      let hasAdminUser = true; // Default to true to avoid redirect on error
      try {
        hasAdminUser = await this.hasAdminUserAsync();
      } catch {
        // If we can't check, assume true to prevent lockout
      }

      return {
        success: false,
        imported,
        skipped,
        errors,
        warnings,
        hasAdminUser,
      };
    }
  }

  /**
   * Imports a single board from JSON export format
   * @param jsonContent JSON string of the exported board
   */
  async importBoardFromJsonAsync(jsonContent: string): Promise<BoardImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.info("Starting single board import from JSON");

    try {
      // Parse and validate the JSON export format
      const exportData = parseEntityExport<{
        board: Record<string, unknown>;
        integrations?: Record<string, unknown>[];
      }>(jsonContent);

      // Validate export type
      if (exportData.type !== "board") {
        throw new Error(`Invalid export type: expected 'board', got '${exportData.type}'`);
      }

      // Validate version compatibility
      if (!isVersionCompatible(exportData.version)) {
        throw new Error(`Incompatible version: ${exportData.version}`);
      }

      const { board, integrations: exportedIntegrations } = exportData.data;

      if (typeof board !== "object" || !board.name) {
        throw new Error("Invalid export: missing board data");
      }

      // Import integrations first if present (they may be referenced by items)
      let integrationsCount = 0;
      if (exportedIntegrations && exportedIntegrations.length > 0) {
        for (const integration of exportedIntegrations) {
          try {
            const result = await this.importIntegrationAsync(integration, "merge");
            if (result === "imported") {
              integrationsCount++;
            }
          } catch (error) {
            warnings.push(`Failed to import integration ${(integration as { name?: string }).name}: ${String(error)}`);
          }
        }
      }

      // Import the board using merge mode (don't overwrite existing)
      const importResult = await this.importBoardAsync(board, "merge");

      // Get the actual imported board details (may differ from original if renamed)
      const boardId = typeof importResult === "object" ? importResult.boardId : (board.id as string);
      const boardName = typeof importResult === "object" ? importResult.boardName : (board.name as string);
      const sectionsCount = (board.sections as unknown[] | undefined)?.length ?? 0;
      const itemsCount = (board.items as unknown[] | undefined)?.length ?? 0;

      logger.info("Single board import completed", {
        boardId,
        boardName,
        sectionsCount,
        itemsCount,
        integrationsCount,
      });

      return {
        success: true,
        boardId,
        boardName,
        sectionsCount,
        itemsCount,
        integrationsCount,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error("Single board import failed", { error: String(error) });
      errors.push(error instanceof Error ? error.message : "Unknown error");

      return {
        success: false,
        boardId: "",
        boardName: "",
        sectionsCount: 0,
        itemsCount: 0,
        integrationsCount: 0,
        errors,
        warnings,
      };
    }
  }

  /**
   * Merges a board from JSON export into an existing board
   * @param jsonContent JSON string of the exported board
   * @param targetBoardId ID of the board to merge into
   */
  async mergeBoardIntoExistingBoardAsync(jsonContent: string, targetBoardId: string): Promise<BoardMergeResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.info("Starting board merge", { targetBoardId });

    try {
      // Verify target board exists and parse export data
      const { targetBoard, board, exportedIntegrations } = await this.validateAndParseMergeDataAsync(
        jsonContent,
        targetBoardId,
      );

      // Import integrations first if present (they may be referenced by items)
      await this.importMergeIntegrationsAsync(exportedIntegrations, warnings);

      // Prepare ID mappers and get existing layouts
      const { sectionIdMap, itemIdMap, layoutIdMap, existingLayouts } =
        await this.prepareMergeMappersAsync(targetBoardId);

      // Import layouts, sections, items, and section layouts
      const layoutsAdded = await this.importMergeLayoutsAsync(board, targetBoardId, existingLayouts, layoutIdMap);
      const sectionsAdded = await this.importMergeSectionsAsync(board, targetBoardId, sectionIdMap);
      const itemsAdded = await this.importMergeItemsAsync(board, targetBoardId, sectionIdMap, itemIdMap, layoutIdMap);
      await this.importMergeSectionLayoutsAsync(board, sectionIdMap, layoutIdMap);

      logger.info("Board merge completed", {
        targetBoardId,
        targetBoardName: targetBoard.name,
        sectionsAdded,
        itemsAdded,
        layoutsAdded,
      });

      return {
        success: true,
        boardId: targetBoardId,
        boardName: targetBoard.name,
        sectionsAdded,
        itemsAdded,
        layoutsAdded,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error("Board merge failed", { error: String(error) });
      errors.push(error instanceof Error ? error.message : "Unknown error");

      return {
        success: false,
        boardId: targetBoardId,
        boardName: "",
        sectionsAdded: 0,
        itemsAdded: 0,
        layoutsAdded: 0,
        errors,
        warnings,
      };
    }
  }

  /**
   * Validates the target board and parses the JSON export data
   */
  private async validateAndParseMergeDataAsync(jsonContent: string, targetBoardId: string) {
    // Verify target board exists
    const targetBoard = await this.db.query.boards.findFirst({
      where: eq(boards.id, targetBoardId),
    });

    if (!targetBoard) {
      throw new Error(`Target board with ID '${targetBoardId}' not found`);
    }

    // Parse and validate the JSON export format
    const exportData = parseEntityExport<{
      board: Record<string, unknown>;
      integrations?: Record<string, unknown>[];
    }>(jsonContent);

    // Validate export type
    if (exportData.type !== "board") {
      throw new Error(`Invalid export type: expected 'board', got '${exportData.type}'`);
    }

    // Validate version compatibility
    if (!isVersionCompatible(exportData.version)) {
      throw new Error(`Incompatible version: ${exportData.version}`);
    }

    const { board, integrations: exportedIntegrations } = exportData.data;

    if (typeof board !== "object" || !board.name) {
      throw new Error("Invalid export: missing board data");
    }

    return { targetBoard, board, exportedIntegrations };
  }

  /**
   * Imports integrations during merge operation
   */
  private async importMergeIntegrationsAsync(
    exportedIntegrations: Record<string, unknown>[] | undefined,
    warnings: string[],
  ) {
    if (!exportedIntegrations || exportedIntegrations.length === 0) {
      return;
    }

    for (const integration of exportedIntegrations) {
      try {
        await this.importIntegrationAsync(integration, "merge");
      } catch (error) {
        warnings.push(`Failed to import integration ${(integration as { name?: string }).name}: ${String(error)}`);
      }
    }
  }

  /**
   * Prepares ID mappers for imported entities and gets existing layouts
   */
  private async prepareMergeMappersAsync(targetBoardId: string) {
    const sectionIdMap = new Map<string, string>();
    const itemIdMap = new Map<string, string>();
    const layoutIdMap = new Map<string, string>();

    const existingLayouts = await this.db.query.layouts.findMany({
      where: eq(layouts.boardId, targetBoardId),
    });

    return { sectionIdMap, itemIdMap, layoutIdMap, existingLayouts };
  }

  /**
   * Imports layouts during merge operation
   */
  private async importMergeLayoutsAsync(
    board: Record<string, unknown>,
    targetBoardId: string,
    existingLayouts: unknown[],
    layoutIdMap: Map<string, string>,
  ) {
    let layoutsAdded = 0;
    const boardLayouts = board.layouts as Record<string, unknown>[] | undefined;
    if (!boardLayouts) {
      return layoutsAdded;
    }

    const existingLayoutNames = new Set(existingLayouts.map((layout) => (layout as { name: string }).name));

    for (const layout of boardLayouts) {
      const layoutName = layout.name as string;
      if (!existingLayoutNames.has(layoutName)) {
        const newLayoutId = createId();
        layoutIdMap.set(layout.id as string, newLayoutId);

        await this.db.insert(layouts).values({
          id: newLayoutId,
          name: layoutName,
          boardId: targetBoardId,
          columnCount: layout.columnCount as number,
          breakpoint: layout.breakpoint as number,
        });
        layoutsAdded++;
      } else {
        // Map to existing layout with same name
        const existingLayout = existingLayouts.find((item) => (item as { name: string }).name === layoutName);
        if (existingLayout) {
          layoutIdMap.set(layout.id as string, (existingLayout as { id: string }).id);
        }
      }
    }

    return layoutsAdded;
  }

  /**
   * Imports sections during merge operation
   */
  private async importMergeSectionsAsync(
    board: Record<string, unknown>,
    targetBoardId: string,
    sectionIdMap: Map<string, string>,
  ) {
    let sectionsAdded = 0;
    const boardSections = board.sections as Record<string, unknown>[] | undefined;
    if (!boardSections) {
      return sectionsAdded;
    }

    for (const section of boardSections) {
      const originalSectionId = section.id as string;
      const newSectionId = createId();
      sectionIdMap.set(originalSectionId, newSectionId);

      await this.db.insert(sections).values({
        id: newSectionId,
        boardId: targetBoardId,
        kind: section.kind as never,
        xOffset: section.xOffset as number | null,
        yOffset: section.yOffset as number | null,
        name: section.name as string | null,
        options: section.options as string | undefined,
      });
      sectionsAdded++;
    }

    return sectionsAdded;
  }

  /**
   * Imports items during merge operation
   */
  private async importMergeItemsAsync(
    board: Record<string, unknown>,
    targetBoardId: string,
    sectionIdMap: Map<string, string>,
    itemIdMap: Map<string, string>,
    layoutIdMap: Map<string, string>,
  ) {
    let itemsAdded = 0;
    const boardItems = board.items as Record<string, unknown>[] | undefined;
    if (!boardItems) {
      return itemsAdded;
    }

    for (const item of boardItems) {
      const originalItemId = item.id as string;
      const newItemId = createId();
      itemIdMap.set(originalItemId, newItemId);

      // Insert item
      await this.db.insert(items).values({
        id: newItemId,
        boardId: targetBoardId,
        kind: item.kind as never,
        options: item.options as string,
        advancedOptions: item.advancedOptions as string,
      });

      // Import item-integration relations
      await this.importMergeItemIntegrationsAsync(item, newItemId);

      // Import item layouts
      await this.importMergeItemLayoutsAsync(item, newItemId, sectionIdMap, layoutIdMap);

      itemsAdded++;
    }

    return itemsAdded;
  }

  /**
   * Imports item-integration relations during merge
   */
  private async importMergeItemIntegrationsAsync(item: Record<string, unknown>, newItemId: string) {
    const itemIntegrations = item.integrations as { integrationId: string }[] | undefined;
    if (!itemIntegrations) {
      return;
    }

    for (const integ of itemIntegrations) {
      const integrationExists = await this.db.query.integrations.findFirst({
        where: eq(integrations.id, integ.integrationId),
      });
      if (integrationExists) {
        await this.db.insert(integrationItems).values({
          itemId: newItemId,
          integrationId: integ.integrationId,
        });
      }
    }
  }

  /**
   * Imports item layouts during merge
   */
  private async importMergeItemLayoutsAsync(
    item: Record<string, unknown>,
    newItemId: string,
    sectionIdMap: Map<string, string>,
    layoutIdMap: Map<string, string>,
  ) {
    const itemLayoutsData = item.layouts as Record<string, unknown>[] | undefined;
    if (!itemLayoutsData) {
      return;
    }

    for (const layout of itemLayoutsData) {
      const originalLayoutId = layout.layoutId as string;
      const mappedLayoutId = layoutIdMap.get(originalLayoutId) ?? originalLayoutId;
      const originalSectionId = layout.sectionId as string;
      const mappedSectionId = sectionIdMap.get(originalSectionId) ?? originalSectionId;

      // Verify layout and section exist
      const layoutExists = await this.db.query.layouts.findFirst({
        where: eq(layouts.id, mappedLayoutId),
      });
      const sectionExists = await this.db.query.sections.findFirst({
        where: eq(sections.id, mappedSectionId),
      });

      if (layoutExists && sectionExists) {
        await this.db.insert(itemLayouts).values({
          itemId: newItemId,
          sectionId: mappedSectionId,
          layoutId: mappedLayoutId,
          xOffset: layout.xOffset as number,
          yOffset: layout.yOffset as number,
          width: layout.width as number,
          height: layout.height as number,
        });
      }
    }
  }

  /**
   * Imports section layouts from board layouts during merge
   */
  private async importMergeSectionLayoutsAsync(
    board: Record<string, unknown>,
    sectionIdMap: Map<string, string>,
    layoutIdMap: Map<string, string>,
  ) {
    const boardLayouts = board.layouts as Record<string, unknown>[] | undefined;
    if (!boardLayouts) {
      return;
    }

    for (const layout of boardLayouts) {
      const layoutSections = layout.sections as Record<string, unknown>[] | undefined;
      if (!layoutSections) continue;

      const targetLayoutId = layoutIdMap.get(layout.id as string) ?? (layout.id as string);

      for (const sectionLayout of layoutSections) {
        await this.importSingleSectionLayoutAsync(sectionLayout, targetLayoutId, sectionIdMap);
      }
    }
  }

  /**
   * Imports a single section layout during merge
   */
  private async importSingleSectionLayoutAsync(
    sectionLayout: Record<string, unknown>,
    targetLayoutId: string,
    sectionIdMap: Map<string, string>,
  ) {
    const originalSectionId = sectionLayout.sectionId as string;
    const mappedSectionId = sectionIdMap.get(originalSectionId);
    const parentSectionId = sectionLayout.parentSectionId as string | null;
    const mappedParentSectionId = parentSectionId ? (sectionIdMap.get(parentSectionId) ?? parentSectionId) : null;

    // Only import if we have a mapped section (from this import)
    if (!mappedSectionId) return;

    const sectionExists = await this.db.query.sections.findFirst({
      where: eq(sections.id, mappedSectionId),
    });

    let parentExists = true;
    if (mappedParentSectionId) {
      const parent = await this.db.query.sections.findFirst({
        where: eq(sections.id, mappedParentSectionId),
      });
      parentExists = Boolean(parent);
    }

    if (sectionExists && parentExists) {
      await this.db.insert(sectionLayouts).values({
        sectionId: mappedSectionId,
        layoutId: targetLayoutId,
        parentSectionId: mappedParentSectionId,
        xOffset: sectionLayout.xOffset as number,
        yOffset: sectionLayout.yOffset as number,
        width: sectionLayout.width as number,
        height: sectionLayout.height as number,
      });
    }
  }

  /**
   * Helper for importing a collection of items
   */
  private async importItemsAsync<T extends Record<string, unknown>>(
    items: T[],
    importFn: (
      item: T,
      mode: ImportOptions["mode"],
    ) => Promise<"imported" | "skipped" | { status: "imported" | "skipped"; boardId?: string; boardName?: string }>,
    mode: ImportOptions["mode"],
    itemNameSingular: string,
  ) {
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const result = await importFn(item, mode);
        // Handle both simple string results and detailed object results
        const status = typeof result === "object" ? result.status : result;
        if (status === "imported") {
          importedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        errors.push(`Failed to import ${itemNameSingular} ${(item as { name?: string }).name}: ${String(error)}`);
      }
    }

    return { importedCount, skippedCount, errors };
  }

  /**
   * Clears all data for full restore mode
   */
  private async clearAllDataAsync(): Promise<void> {
    // Clear sessions first (explicit, not relying on cascade from users)
    // This ensures clean session state after restore
    await this.db.delete(sessions);

    // Delete in reverse dependency order
    await this.db.delete(itemLayouts);
    await this.db.delete(sectionLayouts);
    await this.db.delete(integrationItems);
    await this.db.delete(items);
    await this.db.delete(sections);
    await this.db.delete(layouts);
    await this.db.delete(boardUserPermissions);
    await this.db.delete(boardGroupPermissions);
    await this.db.delete(boards);
    await this.db.delete(searchEngines);
    await this.db.delete(integrationSecrets);
    await this.db.delete(integrationUserPermissions);
    await this.db.delete(integrationGroupPermissions);
    await this.db.delete(integrations);
    await this.db.delete(groupMembers);
    await this.db.delete(groupPermissions);
    await this.db.delete(groups);
    await this.db.delete(users);
    await this.db.delete(apps);
    await this.db.delete(medias);
    await this.db.delete(serverSettings);

    // Reset onboarding to "start" step (delete and recreate to ensure record exists)
    // This is critical because nextOnboardingStepAsync uses UPDATE which won't work on empty table
    await this.db.delete(onboarding);
    await this.db.insert(onboarding).values({
      id: createId(),
      step: "start",
      previousStep: null,
    });

    // NOTE: Don't pre-create "everyone" group here!
    // Let it be imported from backup with its original ID to preserve board/integration permissions.
    // If backup doesn't contain "everyone", it will be created in ensureEveryoneGroupExistsAsync() after import.
  }

  /**
   * Imports an app
   */
  private async importAppAsync(app: Record<string, unknown>, mode: "full" | "merge"): Promise<"imported" | "skipped"> {
    if (mode === "merge") {
      const existing = await this.db.query.apps.findFirst({
        where: eq(apps.id, app.id as string),
      });
      if (existing) return "skipped";
    }

    await this.db.insert(apps).values({
      id: app.id as string,
      name: app.name as string,
      description: app.description as string | undefined,
      iconUrl: app.iconUrl as string,
      href: app.href as string | undefined,
      pingUrl: app.pingUrl as string | undefined,
    });

    return "imported";
  }

  /**
   * Imports a group with permissions
   */
  private async importGroupAsync(
    group: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<"imported" | "skipped"> {
    const groupName = group.name as string;

    // Check for existing group (required for merge mode)
    const existing = await this.db.query.groups.findFirst({
      where: eq(groups.name, groupName),
    });

    if (mode === "merge" && existing) {
      return "skipped";
    }

    // In full mode, handle special system groups:
    if (mode === "full") {
      // "everyone" - import from backup with original ID to preserve board/integration permissions
      // No special handling needed, just import normally

      // "credentials-admin" - only import if it has members (admin users exist in backup)
      // If empty, skip it so onboarding can create it fresh with the new admin user
      if (groupName === credentialsAdminGroup) {
        const members = group.members as { userId: string }[] | undefined;
        const hasMembers = members && members.length > 0;
        if (!hasMembers) {
          return "skipped";
        }
        // Has members - import it so admin users from backup can log in
      }
    }

    await this.db.insert(groups).values({
      id: group.id as string,
      name: groupName,
      ownerId: null, // Set to null initially; users aren't imported yet (FK constraint)
      homeBoardId: null, // Will be set after boards are imported
      mobileHomeBoardId: null,
      position: group.position as number,
    });

    // Import group permissions
    const permissions = group.permissions as { permission: string }[] | undefined;
    if (permissions) {
      for (const permission of permissions) {
        await this.db.insert(groupPermissions).values({
          groupId: group.id as string,
          permission: permission.permission as never,
        });
      }
    }

    return "imported";
  }

  /**
   * Imports a user with group memberships
   */
  private async importUserAsync(
    user: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<"imported" | "skipped"> {
    if (mode === "merge") {
      const existing = await this.db.query.users.findFirst({
        where: eq(users.email, user.email as string),
      });
      if (existing) return "skipped";
    }

    await this.db.insert(users).values({
      id: user.id as string,
      name: user.name as string | null,
      email: user.email as string | null,
      emailVerified: user.emailVerified as Date | null,
      image: user.image as string | null,
      password: user.password as string | null, // Already hashed
      salt: user.salt as string | null,
      provider: user.provider as never,
      homeBoardId: null, // Will be set after boards are imported
      mobileHomeBoardId: null,
      colorScheme: user.colorScheme as never,
      firstDayOfWeek: user.firstDayOfWeek as never,
      pingIconsEnabled: user.pingIconsEnabled as boolean,
      openSearchInNewTab: user.openSearchInNewTab as boolean,
    });

    // Import group memberships (only for groups that exist)
    const groupMemberships = user.groups as { groupId: string }[] | undefined;
    if (groupMemberships) {
      for (const membership of groupMemberships) {
        // Check if the group exists before inserting membership
        // This handles cases where groups like credentials-admin were skipped during import
        const groupExists = await this.db.query.groups.findFirst({
          where: eq(groups.id, membership.groupId),
        });
        if (groupExists) {
          await this.db.insert(groupMembers).values({
            userId: user.id as string,
            groupId: membership.groupId,
          });
        }
      }
    }

    return "imported";
  }

  /**
   * Imports an integration with secrets and permissions
   */
  private async importIntegrationAsync(
    integration: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<"imported" | "skipped"> {
    if (mode === "merge") {
      const existing = await this.db.query.integrations.findFirst({
        where: eq(integrations.name, integration.name as string),
      });
      if (existing) return "skipped";
    }

    await this.db.insert(integrations).values({
      id: integration.id as string,
      name: integration.name as string,
      url: integration.url as string,
      kind: integration.kind as never,
      appId: integration.appId as string | null,
    });

    // Import secrets (already encrypted)
    const secrets = integration.secrets as
      | {
          kind: string;
          value: string;
          updatedAt: Date;
        }[]
      | undefined;
    if (secrets) {
      for (const secret of secrets) {
        await this.db.insert(integrationSecrets).values({
          integrationId: integration.id as string,
          kind: secret.kind as never,
          value: secret.value as never,
          updatedAt: new Date(secret.updatedAt),
        });
      }
    }

    // Import user permissions
    const userPerms = integration.userPermissions as
      | {
          userId: string;
          permission: string;
        }[]
      | undefined;
    if (userPerms) {
      for (const perm of userPerms) {
        await this.db.insert(integrationUserPermissions).values({
          integrationId: integration.id as string,
          userId: perm.userId,
          permission: perm.permission as never,
        });
      }
    }

    // Import group permissions
    const groupPerms = integration.groupPermissions as
      | {
          groupId: string;
          permission: string;
        }[]
      | undefined;
    if (groupPerms) {
      for (const perm of groupPerms) {
        await this.db.insert(integrationGroupPermissions).values({
          integrationId: integration.id as string,
          groupId: perm.groupId,
          permission: perm.permission as never,
        });
      }
    }

    return "imported";
  }

  /**
   * Imports a search engine
   */
  private async importSearchEngineAsync(
    searchEngine: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<"imported" | "skipped"> {
    if (mode === "merge") {
      const existing = await this.db.query.searchEngines.findFirst({
        where: eq(searchEngines.short, searchEngine.short as string),
      });
      if (existing) return "skipped";
    }

    await this.db.insert(searchEngines).values({
      id: searchEngine.id as string,
      iconUrl: searchEngine.iconUrl as string,
      name: searchEngine.name as string,
      short: searchEngine.short as string,
      description: searchEngine.description as string | null,
      urlTemplate: searchEngine.urlTemplate as string | null,
      type: searchEngine.type as never,
      integrationId: searchEngine.integrationId as string | null,
    });

    return "imported";
  }

  /**
   * Imports a board with sections, items, and layouts
   */
  private async importBoardAsync(
    board: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<"imported" | "skipped" | { status: "imported"; boardId: string; boardName: string }> {
    const { boardId, boardName, needsNewIds } = await this.resolveBoardIdentityAsync(board, mode);
    const idMappers = this.createIdMappers(board, needsNewIds);

    await this.insertBoardAsync(board, boardId, boardName);
    await this.importBoardLayoutsAsync(board, boardId, idMappers.getLayoutId);
    await this.importBoardSectionsAsync(board, boardId, idMappers.getSectionId);
    await this.importBoardItemsAsync(board, boardId, idMappers);
    await this.importSectionLayoutsAsync(board, idMappers);
    await this.importBoardPermissionsAsync(board, boardId);

    return { status: "imported", boardId, boardName };
  }

  /**
   * Resolves board identity, handling name conflicts in merge mode
   */
  private async resolveBoardIdentityAsync(
    board: Record<string, unknown>,
    mode: "full" | "merge",
  ): Promise<{ boardId: string; boardName: string; needsNewIds: boolean }> {
    let boardId = board.id as string;
    let boardName = board.name as string;

    if (mode !== "merge") {
      return { boardId, boardName, needsNewIds: false };
    }

    const existing = await this.db.query.boards.findFirst({
      where: eq(boards.name, boardName),
    });

    if (!existing) {
      return { boardId, boardName, needsNewIds: false };
    }

    // Generate new ID and rename for duplicate board
    // Use valid characters only (alphanumeric, hyphen, underscore) per boardNameSchema
    boardId = createId();
    boardName = `${boardName}-imported`;

    // If the renamed board also exists, add a timestamp suffix
    const renamedExists = await this.db.query.boards.findFirst({
      where: eq(boards.name, boardName),
    });
    if (renamedExists) {
      boardName = `${boardName}-${Date.now()}`;
    }

    return { boardId, boardName, needsNewIds: true };
  }

  /**
   * Creates ID mapping functions for layouts, sections, and items
   */
  private createIdMappers(
    board: Record<string, unknown>,
    needsNewIds: boolean,
  ): {
    getLayoutId: (id: string) => string;
    getSectionId: (id: string) => string;
    getItemId: (id: string) => string;
  } {
    const layoutIdMap = new Map<string, string>();
    const sectionIdMap = new Map<string, string>();
    const itemIdMap = new Map<string, string>();

    if (needsNewIds) {
      this.populateIdMap(board.layouts as Record<string, unknown>[] | undefined, layoutIdMap);
      this.populateIdMap(board.sections as Record<string, unknown>[] | undefined, sectionIdMap);
      this.populateIdMap(board.items as Record<string, unknown>[] | undefined, itemIdMap);
    }

    return {
      getLayoutId: (id: string) => layoutIdMap.get(id) ?? id,
      getSectionId: (id: string) => sectionIdMap.get(id) ?? id,
      getItemId: (id: string) => itemIdMap.get(id) ?? id,
    };
  }

  /**
   * Populates an ID map with new IDs for each entity
   */
  private populateIdMap(entities: Record<string, unknown>[] | undefined, idMap: Map<string, string>): void {
    if (!entities) return;
    for (const entity of entities) {
      idMap.set(entity.id as string, createId());
    }
  }

  /**
   * Inserts the board record into the database
   */
  private async insertBoardAsync(board: Record<string, unknown>, boardId: string, boardName: string): Promise<void> {
    await this.db.insert(boards).values({
      id: boardId,
      name: boardName,
      isPublic: board.isPublic as boolean,
      creatorId: board.creatorId as string | null,
      pageTitle: board.pageTitle as string | null,
      metaTitle: board.metaTitle as string | null,
      logoImageUrl: board.logoImageUrl as string | null,
      faviconImageUrl: board.faviconImageUrl as string | null,
      backgroundImageUrl: board.backgroundImageUrl as string | null,
      backgroundImageAttachment: board.backgroundImageAttachment as never,
      backgroundImageRepeat: board.backgroundImageRepeat as never,
      backgroundImageSize: board.backgroundImageSize as never,
      primaryColor: board.primaryColor as string,
      secondaryColor: board.secondaryColor as string,
      opacity: board.opacity as number,
      customCss: board.customCss as string | null,
      iconColor: board.iconColor as string | null,
      itemRadius: board.itemRadius as never,
      disableStatus: board.disableStatus as boolean,
    });
  }

  /**
   * Imports board layouts
   */
  private async importBoardLayoutsAsync(
    board: Record<string, unknown>,
    boardId: string,
    getLayoutId: (id: string) => string,
  ): Promise<void> {
    const boardLayouts = board.layouts as Record<string, unknown>[] | undefined;
    if (!boardLayouts) return;

    for (const layout of boardLayouts) {
      await this.db.insert(layouts).values({
        id: getLayoutId(layout.id as string),
        name: layout.name as string,
        boardId,
        columnCount: layout.columnCount as number,
        breakpoint: layout.breakpoint as number,
      });
    }
  }

  /**
   * Imports board sections
   */
  private async importBoardSectionsAsync(
    board: Record<string, unknown>,
    boardId: string,
    getSectionId: (id: string) => string,
  ): Promise<void> {
    const boardSections = board.sections as Record<string, unknown>[] | undefined;
    if (!boardSections) return;

    for (const section of boardSections) {
      await this.db.insert(sections).values({
        id: getSectionId(section.id as string),
        boardId,
        kind: section.kind as never,
        xOffset: section.xOffset as number | null,
        yOffset: section.yOffset as number | null,
        name: section.name as string | null,
        options: section.options as string | undefined,
      });
    }
  }

  /**
   * Imports board items with their integrations and layouts
   */
  private async importBoardItemsAsync(
    board: Record<string, unknown>,
    boardId: string,
    idMappers: {
      getLayoutId: (id: string) => string;
      getSectionId: (id: string) => string;
      getItemId: (id: string) => string;
    },
  ): Promise<void> {
    const boardItems = board.items as Record<string, unknown>[] | undefined;
    if (!boardItems) return;

    for (const item of boardItems) {
      const newItemId = idMappers.getItemId(item.id as string);
      await this.insertItemAsync(item, boardId, newItemId);
      await this.importItemIntegrationsAsync(item, newItemId);
      await this.importItemLayoutsAsync(item, newItemId, idMappers);
    }
  }

  /**
   * Inserts an item record
   */
  private async insertItemAsync(item: Record<string, unknown>, boardId: string, itemId: string): Promise<void> {
    await this.db.insert(items).values({
      id: itemId,
      boardId,
      kind: item.kind as never,
      options: item.options as string,
      advancedOptions: item.advancedOptions as string,
    });
  }

  /**
   * Imports item-integration relations (only for integrations that exist)
   */
  private async importItemIntegrationsAsync(item: Record<string, unknown>, itemId: string): Promise<void> {
    const itemIntegrations = item.integrations as { integrationId: string }[] | undefined;
    if (!itemIntegrations) return;

    for (const integ of itemIntegrations) {
      const integrationExists = await this.db.query.integrations.findFirst({
        where: eq(integrations.id, integ.integrationId),
      });
      if (integrationExists) {
        await this.db.insert(integrationItems).values({
          itemId,
          integrationId: integ.integrationId,
        });
      }
      // Skip silently if integration doesn't exist - board will still work,
      // widgets just won't have integration data
    }
  }

  /**
   * Imports item layouts
   */
  private async importItemLayoutsAsync(
    item: Record<string, unknown>,
    itemId: string,
    idMappers: {
      getLayoutId: (id: string) => string;
      getSectionId: (id: string) => string;
    },
  ): Promise<void> {
    const itemLayoutsData = item.layouts as Record<string, unknown>[] | undefined;
    if (!itemLayoutsData) return;

    for (const layout of itemLayoutsData) {
      await this.db.insert(itemLayouts).values({
        itemId,
        sectionId: idMappers.getSectionId(layout.sectionId as string),
        layoutId: idMappers.getLayoutId(layout.layoutId as string),
        xOffset: layout.xOffset as number,
        yOffset: layout.yOffset as number,
        width: layout.width as number,
        height: layout.height as number,
      });
    }
  }

  /**
   * Imports section layouts from board layouts
   */
  private async importSectionLayoutsAsync(
    board: Record<string, unknown>,
    idMappers: {
      getLayoutId: (id: string) => string;
      getSectionId: (id: string) => string;
    },
  ): Promise<void> {
    const boardLayouts = board.layouts as Record<string, unknown>[] | undefined;
    if (!boardLayouts) return;

    for (const layout of boardLayouts) {
      const layoutSections = layout.sections as Record<string, unknown>[] | undefined;
      if (!layoutSections) continue;

      for (const sectionLayout of layoutSections) {
        const parentSectionId = sectionLayout.parentSectionId as string | null;
        await this.db.insert(sectionLayouts).values({
          sectionId: idMappers.getSectionId(sectionLayout.sectionId as string),
          layoutId: idMappers.getLayoutId(layout.id as string),
          parentSectionId: parentSectionId ? idMappers.getSectionId(parentSectionId) : null,
          xOffset: sectionLayout.xOffset as number,
          yOffset: sectionLayout.yOffset as number,
          width: sectionLayout.width as number,
          height: sectionLayout.height as number,
        });
      }
    }
  }

  /**
   * Imports board user and group permissions
   */
  private async importBoardPermissionsAsync(board: Record<string, unknown>, boardId: string): Promise<void> {
    await this.importUserPermissionsAsync(board, boardId);
    await this.importGroupPermissionsAsync(board, boardId);
  }

  /**
   * Imports board user permissions
   */
  private async importUserPermissionsAsync(board: Record<string, unknown>, boardId: string): Promise<void> {
    const userPerms = board.userPermissions as { userId: string; permission: string }[] | undefined;
    if (!userPerms) return;

    for (const perm of userPerms) {
      await this.db.insert(boardUserPermissions).values({
        boardId,
        userId: perm.userId,
        permission: perm.permission as never,
      });
    }
  }

  /**
   * Imports board group permissions
   */
  private async importGroupPermissionsAsync(board: Record<string, unknown>, boardId: string): Promise<void> {
    const groupPerms = board.groupPermissions as { groupId: string; permission: string }[] | undefined;
    if (!groupPerms) return;

    for (const perm of groupPerms) {
      await this.db.insert(boardGroupPermissions).values({
        boardId,
        groupId: perm.groupId,
        permission: perm.permission as never,
      });
    }
  }

  /**
   * Imports server settings
   */
  private async importSettingsAsync(settings: unknown): Promise<void> {
    const settingsArray = settings as { settingKey: string; value: string }[];
    for (const setting of settingsArray) {
      await this.db
        .insert(serverSettings)
        .values({
          settingKey: setting.settingKey,
          value: setting.value,
        })
        .onConflictDoUpdate({
          target: serverSettings.settingKey,
          set: { value: setting.value },
        });
    }
  }

  /**
   * Imports media files from the backup
   */
  private async importMediaFilesAsync(mediaFolder: JSZip): Promise<number> {
    let count = 0;
    const files = Object.values(mediaFolder.files).filter((file) => !file.dir);

    for (const file of files) {
      const content = await file.async("nodebuffer");
      const fileName = file.name.replace("media/", "");

      // Parse the media ID and original name from the file name
      // Format: {id}-{originalName}
      const dashIndex = fileName.indexOf("-");
      if (dashIndex === -1) continue;

      const id = fileName.substring(0, dashIndex);
      const name = fileName.substring(dashIndex + 1);

      // Determine content type from file extension
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      const contentTypeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
      };
      const contentType = contentTypeMap[ext] ?? "application/octet-stream";

      await this.db
        .insert(medias)
        .values({
          id,
          name,
          content,
          contentType,
          size: content.length,
          createdAt: new Date(),
          creatorId: null,
        })
        .onConflictDoNothing();

      count++;
    }

    return count;
  }

  /**
   * Returns empty imported counts
   */
  private emptyImportedCounts(): ImportedCounts {
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

  /**
   * Checks if any admin user exists after import
   * An admin user is a user who is a member of a group that has the 'admin' permission
   */
  private async hasAdminUserAsync(): Promise<boolean> {
    const adminGroups = await this.db.query.groupPermissions.findMany({
      where: eq(groupPermissions.permission, "admin"),
    });

    if (adminGroups.length === 0) {
      return false;
    }

    // Check if any of these admin groups have members
    for (const adminGroup of adminGroups) {
      const members = await this.db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, adminGroup.groupId),
      });
      if (members.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ensures the "everyone" group exists after import
   * Creates it if the backup didn't contain it
   */
  private async ensureEveryoneGroupExistsAsync(): Promise<void> {
    const existing = await this.db.query.groups.findFirst({
      where: eq(groups.name, everyoneGroup),
    });

    if (!existing) {
      logger.info("Creating 'everyone' group (not found in backup)");
      await this.db.insert(groups).values({
        id: createId(),
        name: everyoneGroup,
        position: -1,
      });
    }
  }

  /**
   * Updates home boards for users and groups after boards are imported
   * This is needed because users and groups are imported before boards
   */
  private async updateHomeBoardsAsync(
    backupUsers: Record<string, unknown>[],
    backupGroups: Record<string, unknown>[],
  ): Promise<void> {
    // Update user home boards
    for (const user of backupUsers) {
      const userId = user.id as string;
      const homeBoardId = user.homeBoardId as string | null;
      const mobileHomeBoardId = user.mobileHomeBoardId as string | null;

      if (homeBoardId || mobileHomeBoardId) {
        // Verify the board exists before updating
        const updates: { homeBoardId?: string | null; mobileHomeBoardId?: string | null } = {};

        if (homeBoardId) {
          const boardExists = await this.db.query.boards.findFirst({
            where: eq(boards.id, homeBoardId),
          });
          if (boardExists) {
            updates.homeBoardId = homeBoardId;
          }
        }

        if (mobileHomeBoardId) {
          const boardExists = await this.db.query.boards.findFirst({
            where: eq(boards.id, mobileHomeBoardId),
          });
          if (boardExists) {
            updates.mobileHomeBoardId = mobileHomeBoardId;
          }
        }

        if (Object.keys(updates).length > 0) {
          await this.db.update(users).set(updates).where(eq(users.id, userId));
        }
      }
    }

    // Update group home boards
    for (const group of backupGroups) {
      const groupId = group.id as string;
      const homeBoardId = group.homeBoardId as string | null;
      const mobileHomeBoardId = group.mobileHomeBoardId as string | null;

      if (homeBoardId || mobileHomeBoardId) {
        // Verify the board exists before updating
        const updates: { homeBoardId?: string | null; mobileHomeBoardId?: string | null } = {};

        if (homeBoardId) {
          const boardExists = await this.db.query.boards.findFirst({
            where: eq(boards.id, homeBoardId),
          });
          if (boardExists) {
            updates.homeBoardId = homeBoardId;
          }
        }

        if (mobileHomeBoardId) {
          const boardExists = await this.db.query.boards.findFirst({
            where: eq(boards.id, mobileHomeBoardId),
          });
          if (boardExists) {
            updates.mobileHomeBoardId = mobileHomeBoardId;
          }
        }

        if (Object.keys(updates).length > 0) {
          await this.db.update(groups).set(updates).where(eq(groups.id, groupId));
        }
      }
    }

    logger.debug("Updated home boards for users and groups");
  }
}
