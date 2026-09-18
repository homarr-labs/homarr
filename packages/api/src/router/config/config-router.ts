import { z } from "zod/v4";

import { configExportSchema, configImportSchema } from "@homarr/validation/config";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { createConfigExportDocumentAsync, importConfigDocumentAsync } from "./config-io";

export const configRouter = createTRPCRouter({
  export: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: { method: "GET", path: "/api/config/export", tags: ["config"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Export the whole instance configuration: server settings, apps, integrations (without secret values), search engines, groups and every board. Users, group members and secret values are not included. Requires admin permission",
      },
    })
    .input(z.void())
    .output(configExportSchema)
    .query(async ({ ctx }) => {
      return await createConfigExportDocumentAsync(ctx.db);
    }),
  import: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: { method: "POST", path: "/api/config/import", tags: ["config"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Apply a configuration document produced by config_export. Ids are kept as they are, so the same document can be applied repeatedly. onConflict controls what happens to entities that already exist: 'fail' (default) aborts, 'skip' only creates the missing ones, 'replace' additionally updates them and recreates boards. Integration secrets can be supplied per integration under 'secrets'. Server settings are always merged. Requires admin permission",
      },
    })
    .input(configImportSchema)
    .output(
      z.object({
        created: z.record(z.string(), z.number()),
        updated: z.record(z.string(), z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await importConfigDocumentAsync(ctx.db, input, ctx.session.user.id);
    }),
});
