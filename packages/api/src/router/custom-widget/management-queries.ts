import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq, or } from "@homarr/db";
import { boards, customWidgetDefinitions } from "@homarr/db/schema";

import { permissionRequiredProcedure, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { parseDisplayConfig } from "./parse-display-config";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");
const logger = createLogger({ module: "custom-widget" });

export const managementQueryProcedures = {
  all: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List all custom-widget definitions. Admin only. Use the returned ID to inspect or update a widget.",
      },
    })
    .query(async ({ ctx }) => {
      const definitions = await ctx.db.query.customWidgetDefinitions.findMany({
        orderBy: (table, { asc }) => asc(table.name),
      });
      return definitions.map((definition) => ({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        iconUrl: definition.iconUrl,
        url: definition.url,
        method: definition.method,
        displayType: definition.displayType,
        authType: definition.authType,
        enabled: definition.enabled,
      }));
    }),

  byId: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get one complete custom-widget definition for iterative editing. REQUIRED: id. Stored secret values are never returned; only their presence is reported.",
      },
    })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
        with: { secrets: true },
      });
      if (!definition) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      return {
        ...definition,
        displayConfig: parseDisplayConfig(
          definition.displayConfig,
          input.id,
          logger,
          "Corrupt displayConfig in custom widget",
        ),
        secrets: definition.secrets.map((secret) => ({
          kind: secret.kind,
          hasValue: true,
          updatedAt: secret.updatedAt,
        })),
      };
    }),

  available: protectedProcedure
    .input(z.object({ boardId: z.string(), currentId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      return ctx.db.query.customWidgetDefinitions.findMany({
        where: input.currentId
          ? or(eq(customWidgetDefinitions.enabled, true), eq(customWidgetDefinitions.id, input.currentId))
          : eq(customWidgetDefinitions.enabled, true),
        orderBy: (table, { asc }) => asc(table.name),
        columns: { id: true, name: true, description: true, iconUrl: true, displayType: true },
      });
    }),
};
