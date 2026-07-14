import { TRPCError } from "@trpc/server";
import { stringify as stringifySuperJson } from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import {
  customWidgetCreateSchema,
  customWidgetUpdateSchema,
  customJsxDisplayConfigV2Schema,
} from "@homarr/custom-widgets/core";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { managementQueryProcedures } from "./management-queries";
import { metadataProcedures } from "./metadata-procedures";
import { previewActionProcedures } from "./preview-action-procedures";
import { previewBaseProcedures } from "./preview-base-procedures";
import { previewQueryProcedures } from "./preview-query-procedures";
import { parseDisplayConfig } from "./parse-display-config";
import { transferProcedures } from "./transfer-procedures";
import { templateProcedures } from "./template-procedures";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const updateFieldSerializers: Record<string, (value: unknown) => unknown> = {
  displayConfig: (value) => stringifySuperJson(value),
};

export const customWidgetRouter = createTRPCRouter({
  ...metadataProcedures,

  ...managementQueryProcedures,

  create: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a validated custom widget. Admin only. Call customWidget_schema and customWidget_validate first. For Custom JSX use jsxApiVersion 2, named requests, a GET base method, and no inline credentials.",
      },
    })
    .input(customWidgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = createId();

      await ctx.db.insert(customWidgetDefinitions).values({
        id,
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        url: input.url,
        authType: input.authType,
        headerName: input.headerName,
        method: input.method,
        requestBody: input.requestBody,
        displayType: input.displayType,
        displayConfig: stringifySuperJson(input.displayConfig),
        creatorId: ctx.session.user.id,
      });

      if (input.secrets.length > 0) {
        await ctx.db.insert(customWidgetSecrets).values(
          input.secrets.map((secret) => ({
            kind: secret.kind,
            value: encryptSecret(secret.value),
            definitionId: id,
            updatedAt: new Date(),
          })),
        );
      }

      logger.info("Created custom widget definition", { id, name: input.name });
      return { id };
    }),

  update: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Update an existing custom widget. Admin only. REQUIRED: id. Read it with customWidget_byId, preserve unrelated fields, validate the resulting complete draft, then send the changed fields. Omit secrets to preserve stored credentials.",
      },
    })
    .input(customWidgetUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const effectiveDisplayConfig =
        input.displayConfig ??
        parseDisplayConfig(existing.displayConfig, input.id, logger, "Corrupt displayConfig in custom widget update");
      const effectiveMethod = input.method ?? existing.method;
      if (customJsxDisplayConfigV2Schema.safeParse(effectiveDisplayConfig).success && effectiveMethod !== "GET") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom JSX v2 base data requests must use GET; mutations belong in named actions",
        });
      }

      const { id, secrets, ...updateFields } = input;
      const updateValues: Record<string, unknown> = { updatedAt: new Date() };

      for (const [key, value] of Object.entries(updateFields)) {
        if (value === undefined) continue;
        const serialize = updateFieldSerializers[key];
        if (serialize) {
          updateValues[key] = serialize(value);
        } else {
          updateValues[key] = value;
        }
      }

      await ctx.db.update(customWidgetDefinitions).set(updateValues).where(eq(customWidgetDefinitions.id, id));

      if (secrets !== undefined) {
        const effectiveAuthType = (updateFields.authType as string | undefined) ?? existing.authType;

        if (secrets.length > 0) {
          await ctx.db.delete(customWidgetSecrets).where(eq(customWidgetSecrets.definitionId, id));
          await ctx.db.insert(customWidgetSecrets).values(
            secrets.map((secret) => ({
              kind: secret.kind,
              value: encryptSecret(secret.value),
              definitionId: id,
              updatedAt: new Date(),
            })),
          );
        } else if (
          effectiveAuthType === "none" ||
          (typeof updateFields.authType === "string" && updateFields.authType !== existing.authType)
        ) {
          await ctx.db.delete(customWidgetSecrets).where(eq(customWidgetSecrets.definitionId, id));
        }
      }

      logger.info("Updated custom widget definition", { id });
    }),

  toggleEnabled: adminProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await ctx.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
    logger.info("Deleted custom widget definition", { id: input.id });
  }),

  ...templateProcedures,

  ...transferProcedures,

  ...previewBaseProcedures,
  ...previewQueryProcedures,
  ...previewActionProcedures,

  duplicate: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const newId = createId();
    await ctx.db.insert(customWidgetDefinitions).values({
      id: newId,
      name: `${definition.name} (copy)`,
      description: definition.description,
      iconUrl: definition.iconUrl,
      url: definition.url,
      authType: definition.authType,
      headerName: definition.headerName,
      method: definition.method,
      requestBody: definition.requestBody,
      displayType: definition.displayType,
      displayConfig: definition.displayConfig,
      enabled: definition.enabled,
      creatorId: ctx.session.user.id,
    });

    if (definition.secrets.length > 0) {
      await ctx.db.insert(customWidgetSecrets).values(
        definition.secrets.map((s) => ({
          kind: s.kind,
          value: s.value,
          definitionId: newId,
          updatedAt: new Date(),
        })),
      );
    }

    logger.info("Duplicated custom widget definition", { sourceId: input.id, newId });
    return { id: newId, name: `${definition.name} (copy)` };
  }),
});
