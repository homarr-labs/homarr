import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { customWidgetImportSchema, customWidgetSecretsInputSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { assertSecretSources } from "./secret-policy";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const logger = createLogger({ module: "custom-widget" });

export const transferProcedures = {
  export: manageProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
    return parseStoredCustomWidgetDefinition(definition);
  }),

  import: manageProcedure
    .input(z.object({ widget: customWidgetImportSchema, secrets: customWidgetSecretsInputSchema.default([]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing imported widget secrets requires dedicated permission",
        });
      }
      assertSecretSources(input.widget.sources, input.secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, input.widget, ctx.session.user.id, input.secrets);
      logger.info("Imported custom widget definition", { id, name: input.widget.name });
      return { id };
    }),
};
