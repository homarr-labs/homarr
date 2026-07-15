import { TRPCError } from "@trpc/server";
import { stringify as stringifySuperJson } from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { customWidgetImportSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseDisplayConfig } from "./parse-display-config";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");
const logger = createLogger({ module: "custom-widget" });

export const transferProcedures = {
  export: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Export one custom widget as a homarr-custom-widget-v3 object. REQUIRED: id. Secrets are excluded.",
      },
    })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        $schema: "homarr-custom-widget-v3" as const,
        name: definition.name,
        description: definition.description,
        iconUrl: definition.iconUrl,
        url: definition.url,
        authType: definition.authType,
        headerName: definition.headerName,
        method: definition.method,
        requestBody: definition.requestBody,
        displayType: definition.displayType,
        displayConfig: parseDisplayConfig(
          definition.displayConfig,
          input.id,
          logger,
          "Corrupt displayConfig during export",
        ),
      };
    }),

  import: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a custom widget from a validated homarr-custom-widget-v3 import object. Secrets are omitted and configured separately.",
      },
    })
    .input(customWidgetImportSchema)
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
      logger.info("Imported custom widget definition", { id, name: input.name });
      return { id };
    }),
};
