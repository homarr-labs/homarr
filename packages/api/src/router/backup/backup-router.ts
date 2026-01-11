import fs from "fs/promises";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { isProviderEnabled } from "@homarr/auth/server";
import { constructBoardPermissions } from "@homarr/auth/shared";
import {
  BackupImporter,
  BackupValidator,
  BoardExporter,
  FullExporter,
  generateBoardExportFileName,
} from "@homarr/backup";
import { desc, eq, inArray } from "@homarr/db";
import {
  backups,
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  onboarding,
} from "@homarr/db/schema";

import { createTRPCRouter, onboardingProcedure, permissionRequiredProcedure, protectedProcedure } from "../../trpc";

// Output schemas for OpenAPI documentation
const backupCreatorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  email: z.string().nullable(),
});

const backupSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["manual", "auto"]),
  status: z.enum(["completed", "failed"]),
  filePath: z.string(),
  fileSize: z.number(),
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  creator: backupCreatorSchema.nullable(),
});

const backupListOutputSchema = z.array(backupSchema);

const createBackupOutputSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
});

const exportBoardOutputSchema = z.object({
  data: z.string(),
  fileName: z.string(),
});

const importBoardOutputSchema = z.object({
  success: z.boolean(),
  boardId: z.string(),
  boardName: z.string(),
  sectionsCount: z.number(),
  itemsCount: z.number(),
  integrationsCount: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

const downloadOutputSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
});

const deleteOutputSchema = z.object({
  success: z.boolean(),
});

const validationSummarySchema = z.object({
  boards: z.number(),
  integrations: z.number(),
  users: z.number(),
  groups: z.number(),
  apps: z.number(),
  mediaFiles: z.number(),
  searchEngines: z.number(),
});

const backupMetadataSchema = z.object({
  version: z.string(),
  homarrVersion: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string().nullable(),
  checksum: z.string(),
});

const validateOutputSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  summary: validationSummarySchema,
  metadata: backupMetadataSchema.optional(),
});

const importedCountsSchema = z.object({
  boards: z.number(),
  integrations: z.number(),
  users: z.number(),
  groups: z.number(),
  apps: z.number(),
  mediaFiles: z.number(),
  searchEngines: z.number(),
});

const restoreOutputSchema = z.object({
  success: z.boolean(),
  imported: importedCountsSchema,
  skipped: importedCountsSchema,
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  hasAdminUser: z.boolean(),
  requiresOnboarding: z.boolean(),
  requiresLogin: z.boolean(),
});

export const backupRouter = createTRPCRouter({
  /**
   * List all backups (own backups for users, all backups for admins)
   */
  list: protectedProcedure
    .input(z.void())
    .output(backupListOutputSchema)
    .meta({
      openapi: {
        method: "GET",
        path: "/api/backups",
        tags: ["backups"],
        protect: true,
        summary: "List all backups",
        description: "Returns all backups for admins, or only own backups for regular users",
      },
    })
    .query(async ({ ctx }) => {
      const isAdmin = ctx.session.user.permissions.includes("admin");

      return ctx.db.query.backups.findMany({
        where: isAdmin ? undefined : eq(backups.createdBy, ctx.session.user.id),
        orderBy: desc(backups.createdAt),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });
    }),

  /**
   * Get a specific backup by ID
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(backupSchema)
    .meta({
      openapi: {
        method: "GET",
        path: "/api/backups/{id}",
        tags: ["backups"],
        protect: true,
        summary: "Get backup by ID",
        description: "Returns details of a specific backup. Requires ownership or admin permission.",
      },
    })
    .query(async ({ input, ctx }) => {
      const backup = await ctx.db.query.backups.findFirst({
        where: eq(backups.id, input.id),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });

      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }

      const isAdmin = ctx.session.user.permissions.includes("admin");
      const isOwner = backup.createdBy === ctx.session.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to view this backup" });
      }

      return backup;
    }),

  /**
   * Create a full system backup (admin only)
   */
  createFull: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      }),
    )
    .output(createBackupOutputSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/backups",
        tags: ["backups"],
        protect: true,
        summary: "Create full system backup",
        description:
          "Creates a complete backup of the system including boards, integrations, users, and settings. Admin only.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      const exporter = new FullExporter(ctx.db);
      const backup = await exporter.exportAsync({
        name: input.name,
        userId: ctx.session.user.id,
      });

      return {
        id: backup.id,
        fileName: backup.fileName,
        fileSize: backup.fileSize,
      };
    }),

  /**
   * Export a single board (requires board access)
   */
  exportBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        includeIntegrations: z.boolean().default(false),
      }),
    )
    .output(exportBoardOutputSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/backups/export-board",
        tags: ["backups"],
        protect: true,
        summary: "Export a single board",
        description: "Exports a board configuration as JSON. Requires full access to the board.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      // Get user's groups for permission check
      const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, ctx.session.user.id),
      });

      // Check board access with permissions
      const board = await ctx.db.query.boards.findFirst({
        where: eq(boards.id, input.boardId),
        with: {
          userPermissions: {
            where: eq(boardUserPermissions.userId, ctx.session.user.id),
          },
          groupPermissions: {
            where: inArray(boardGroupPermissions.groupId, groupsOfCurrentUser.map((group) => group.groupId).concat("")),
          },
        },
      });

      if (!board) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
      }

      const permissions = constructBoardPermissions(board, ctx.session);
      if (!permissions.hasFullAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to export this board" });
      }

      const exporter = new BoardExporter(ctx.db);
      const data = await exporter.exportAsync(input.boardId, {
        includeIntegrations: input.includeIntegrations,
      });

      return {
        data: JSON.stringify(data, null, 2),
        fileName: generateBoardExportFileName(board.name),
      };
    }),

  /**
   * Import a single board from JSON export (requires board-create permission)
   */
  importBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(
      z.object({
        jsonContent: z.string().describe("JSON content of the exported board"),
      }),
    )
    .output(importBoardOutputSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/backups/import-board",
        tags: ["backups"],
        protect: true,
        summary: "Import a single board from JSON",
        description:
          "Imports a board from JSON export format. Uses merge mode - existing boards with the same name will cause the imported board to be renamed.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      const importer = new BackupImporter(ctx.db);
      return await importer.importBoardFromJsonAsync(input.jsonContent);
    }),

  /**
   * Get download info for a backup (checks permissions)
   */
  download: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(downloadOutputSchema)
    .meta({
      openapi: {
        method: "GET",
        path: "/api/backups/{id}/download",
        tags: ["backups"],
        protect: true,
        summary: "Get backup download info",
        description: "Returns file path and name for downloading a backup. Requires ownership or admin permission.",
      },
    })
    .query(async ({ input, ctx }) => {
      const backup = await ctx.db.query.backups.findFirst({
        where: eq(backups.id, input.id),
      });

      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }

      const isAdmin = ctx.session.user.permissions.includes("admin");
      const isOwner = backup.createdBy === ctx.session.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to download this backup" });
      }

      return {
        filePath: backup.filePath,
        fileName: `${backup.name}.zip`,
      };
    }),

  /**
   * Delete a backup (owner or admin)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(deleteOutputSchema)
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/backups/{id}",
        tags: ["backups"],
        protect: true,
        summary: "Delete a backup",
        description: "Deletes a backup file and its database record. Requires ownership or admin permission.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      const backup = await ctx.db.query.backups.findFirst({
        where: eq(backups.id, input.id),
      });

      if (!backup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
      }

      const isAdmin = ctx.session.user.permissions.includes("admin");
      const isOwner = backup.createdBy === ctx.session.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to delete this backup" });
      }

      // Delete file from filesystem
      try {
        await fs.unlink(backup.filePath);
      } catch (error) {
        // File might not exist, but we still want to delete the record
        console.warn(`Failed to delete backup file: ${backup.filePath}`, error);
      }

      // Delete database record
      await ctx.db.delete(backups).where(eq(backups.id, input.id));

      return { success: true };
    }),

  /**
   * Validate a backup file before import (admin only)
   */
  validate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        fileContent: z.string().describe("Base64 encoded backup file content"),
      }),
    )
    .output(validateOutputSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/backups/validate",
        tags: ["backups"],
        protect: true,
        summary: "Validate a backup file",
        description:
          "Validates a backup file before import. Returns validation result with errors, warnings, and summary. Admin only.",
      },
    })
    .mutation(async ({ input }) => {
      const validator = new BackupValidator();
      return await validator.validateAsync(input.fileContent);
    }),

  /**
   * Restore from a backup (admin only)
   */
  restore: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        fileContent: z.string().describe("Base64 encoded backup file content"),
        mode: z
          .enum(["full", "merge"])
          .default("merge")
          .describe("Restore mode: 'full' replaces all data, 'merge' adds to existing data"),
        createBackupFirst: z.boolean().default(true).describe("Create a backup before restoring"),
      }),
    )
    .output(restoreOutputSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/backups/restore",
        tags: ["backups"],
        protect: true,
        summary: "Restore from a backup",
        description:
          "Restores the system from a backup file. Full mode replaces all data, merge mode adds to existing data. Admin only.",
      },
    })
    .mutation(async ({ input, ctx }) => {
      // Create pre-restore backup if requested
      if (input.createBackupFirst) {
        const exporter = new FullExporter(ctx.db);
        await exporter.exportAsync({
          name: `Pre-restore backup ${new Date().toISOString()}`,
          userId: ctx.session.user.id,
        });
      }

      const importer = new BackupImporter(ctx.db);
      const result = await importer.importAsync(input.fileContent, {
        mode: input.mode,
      });

      // Determine redirect action based on admin status and restore mode
      const isFullRestore = input.mode === "full";
      const credentialsEnabled = isProviderEnabled("credentials");

      // After full restore:
      // - If no admin user exists AND credentials are enabled -> redirect to onboarding
      // - If admin user exists -> redirect to login (session was cleared)
      // - For merge mode -> no redirect needed (session preserved)
      const requiresOnboarding = isFullRestore && !result.hasAdminUser && credentialsEnabled;
      const requiresLogin = isFullRestore && result.hasAdminUser;

      return {
        ...result,
        requiresOnboarding,
        requiresLogin,
      };
    }),

  /**
   * Validate a backup file during onboarding (at start step)
   * Note: This endpoint is not exposed in OpenAPI as it's for internal onboarding flow
   */
  validateOnboarding: onboardingProcedure
    .requiresStep("start")
    .input(
      z.object({
        fileContent: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const validator = new BackupValidator();
      return await validator.validateAsync(input.fileContent);
    }),

  /**
   * Restore from a backup during onboarding (at start step)
   * Note: This endpoint is not exposed in OpenAPI as it's for internal onboarding flow
   */
  restoreOnboarding: onboardingProcedure
    .requiresStep("start")
    .input(
      z.object({
        fileContent: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const importer = new BackupImporter(ctx.db);
      const result = await importer.importAsync(input.fileContent, {
        mode: "full",
      });

      // Set onboarding to "finish" to allow redirect to login page
      // The proxy middleware checks if onboarding is finished before allowing access to other pages
      await ctx.db.update(onboarding).set({
        step: "finish",
        previousStep: "start",
      });

      return {
        ...result,
        // After onboarding restore, always redirect to login
        // (backup should contain admin users)
        requiresLogin: true,
      };
    }),
});
