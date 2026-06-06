import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  exportFullConfigAsync,
  importFullConfigAsync,
  parseAndValidateBundle,
  previewExportFullConfigAsync,
  previewImportFullConfigAsync,
} from "@homarr/board-portability";

import packageJson from "../../../../package.json";
import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const configRouter = createTRPCRouter({
  previewExport: permissionRequiredProcedure.requiresPermission("admin").query(async ({ ctx }) => {
    return await previewExportFullConfigAsync(ctx.db);
  }),

  previewImport: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await previewImportFullConfigAsync(ctx.db, input.content, packageJson.version);
    }),

  exportFull: permissionRequiredProcedure.requiresPermission("admin").mutation(async ({ ctx }) => {
    return await exportFullConfigAsync(ctx.db, packageJson.version);
  }),

  importFull: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const bundle = parseAndValidateBundle(input.content, packageJson.version);
        return await importFullConfigAsync(ctx.db, bundle, ctx.session.user.id);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid config" });
      }
    }),
});
