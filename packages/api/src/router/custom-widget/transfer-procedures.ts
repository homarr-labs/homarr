import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { customWidgetImportSchema, customWidgetSecretsInputSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { assertSecretSources } from "./secret-policy";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

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
      const id = createId();
      await ctx.db.insert(customWidgetDefinitions).values({
        id,
        ...serializeCustomWidgetDefinition(input.widget),
        creatorId: ctx.session.user.id,
      });
      if (input.secrets.length > 0) {
        await ctx.db.insert(customWidgetSecrets).values(
          input.secrets.map((secret) => ({
            definitionId: id,
            sourceId: secret.sourceId,
            kind: secret.kind,
            encryptedValue: encryptSecret(secret.value),
            updatedAt: new Date(),
          })),
        );
      }
      logger.info("Imported custom widget definition", { id, name: input.widget.name });
      return { id };
    }),
};
