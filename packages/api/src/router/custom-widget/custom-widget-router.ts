import { assertCustomWidgetIntegrationBindings } from "./source-resolver";
import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import {
  customWidgetDefinitionSchema,
  customWidgetUpdateSchema,
  normalizeCustomWidgetAuthoringUpdate,
} from "@homarr/custom-widgets/core";

import { createApiRouter, permissionRequiredProcedure } from "../../procedure";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { creationProcedures } from "./creation-procedures";
import { updateCustomWidgetDefinition } from "./definition-update";
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
import { assertSecretSources } from "./secret-policy";
import { secretProcedures } from "./secret-procedures";
import { workshopProcedures } from "./workshop-procedures";

const logger = createLogger({ module: "custom-widget" });

export const customWidgetRouter = createApiRouter({
  ...metadataProcedures,
  ...managementQueryProcedures,
  ...creationProcedures,

  update: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Update one Custom JSX widget. Prefer templateLines for multiline JSX changes. Returns a client-navigable edit link.",
      },
    })
    .input(customWidgetUpdateSchema)
    .mutation(async ({ context, input }) => {
      const existing = await context.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new ApiError({ code: "NOT_FOUND" });

      const current = parseStoredCustomWidgetDefinition(existing);
      const { id, secrets, ...authoringChanges } = input;
      const definition = parseCustomWidgetAuthoringInput(() => {
        const changes = normalizeCustomWidgetAuthoringUpdate(authoringChanges);
        return customWidgetDefinitionSchema.parse({ ...current, ...changes });
      });
      await assertCustomWidgetIntegrationBindings(context, definition.sources);
      if (secrets) assertSecretSources(definition.sources, secrets);
      await updateCustomWidgetDefinition(context.db, { id, definition, secrets });
      logger.info("Updated custom widget definition", { id });
      return { id, managementPath: `/manage/custom-widgets/edit/${id}` };
    }),

  ...secretProcedures,
  ...workshopProcedures,

  toggleEnabled: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ context, input }) => {
      if (input.enabled) {
        const definition = await context.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!definition) throw new ApiError({ code: "NOT_FOUND" });
        if (!safeParseStoredCustomWidgetDefinition(definition).success) {
          throw new ApiError({
            code: "BAD_REQUEST",
            message: "Invalid custom widget definition cannot be enabled",
          });
        }
      }

      await context.db
        .update(customWidgetDefinitions)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
    }),

  delete: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Delete one Custom JSX widget." } })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ context, input }) => {
      await context.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
      logger.info("Deleted custom widget definition", { id: input.id });
    }),

  duplicate: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ context, input }) => {
      const existing = await context.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new ApiError({ code: "NOT_FOUND" });
      const current = parseStoredCustomWidgetDefinition(existing);
      const id = createId();
      await context.db.insert(customWidgetDefinitions).values({
        id,
        ...serializeCustomWidgetDefinition({ ...current, name: `${current.name} (copy)` }),
        creatorId: context.session.user.id,
      });
      return { id, name: `${current.name} (copy)` };
    }),

  ...templateProcedures,
  ...transferProcedures,
  ...previewBaseProcedures,
  ...previewQueryProcedures,
  ...previewActionProcedures,
});
