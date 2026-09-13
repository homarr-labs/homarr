import { contentProcedures } from "./content-procedures";
import { nativeProcedures } from "./native-procedures";
import { workshopUpdateProcedures } from "./workshop-update-procedures";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { creationProcedures } from "./creation-procedures";
import { managementQueryProcedures } from "./management-queries";
import { metadataProcedures } from "./metadata-procedures";
import { previewActionProcedures } from "./preview-action-procedures";
import { previewBaseProcedures } from "./preview-base-procedures";
import { previewQueryProcedures } from "./preview-query-procedures";
import {
  parseStoredCustomWidgetDefinition,
  safeParseStoredCustomWidgetDefinition,
  serializeCustomWidgetDefinition,
} from "./stored-definition";
import { templateProcedures } from "./template-procedures";
import { transferProcedures } from "./transfer-procedures";
import { secretProcedures } from "./secret-procedures";
import { workshopProcedures } from "./workshop-procedures";
import { updateCustomWidgetProcedure } from "./definition-update-procedure";

const logger = createLogger({ module: "custom-widget" });

export const customWidgetRouter = createTRPCRouter({
  ...metadataProcedures,
  ...nativeProcedures,
  ...contentProcedures,
  ...managementQueryProcedures,
  ...creationProcedures,

  update: updateCustomWidgetProcedure,

  ...secretProcedures,
  ...workshopProcedures,
  ...workshopUpdateProcedures,

  toggleEnabled: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.enabled) {
        const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
        if (!safeParseStoredCustomWidgetDefinition(definition).success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid custom widget definition cannot be enabled",
          });
        }
      }

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
    }),

  delete: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Delete one Custom JSX widget." } })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
      logger.info("Deleted custom widget definition", { id: input.id });
    }),

  duplicate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const current = parseStoredCustomWidgetDefinition(existing);
      const id = createId();
      await ctx.db.insert(customWidgetDefinitions).values({
        id,
        ...serializeCustomWidgetDefinition({ ...current, name: `${current.name} (copy)` }),
        creatorId: ctx.session.user.id,
      });
      return { id, name: `${current.name} (copy)` };
    }),

  ...templateProcedures,
  ...transferProcedures,
  ...previewBaseProcedures,
  ...previewQueryProcedures,
  ...previewActionProcedures,
});
