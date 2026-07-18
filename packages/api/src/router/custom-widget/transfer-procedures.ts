import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { customWidgetImportSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
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

  import: manageProcedure.input(customWidgetImportSchema).mutation(async ({ ctx, input }) => {
    const id = createId();
    await ctx.db.insert(customWidgetDefinitions).values({
      id,
      ...serializeCustomWidgetDefinition(input),
      creatorId: ctx.session.user.id,
    });
    logger.info("Imported custom widget definition", { id, name: input.name });
    return { id };
  }),
};
