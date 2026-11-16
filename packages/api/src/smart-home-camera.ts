import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations/factory";

import { createOneIntegrationMiddleware } from "./middlewares/integration";
import { createTRPCRouter, publicProcedure } from "./trpc";

export { createTRPCContext } from "./trpc";

// Native HTTP only: Response bodies must not be serialized through tRPC or MCP.
// ponytail: This caller is not registered on appRouter. The Next route is the only
// endpoint; retain this adapter to reuse integration query authorization and cancellation.
export const smartHomeCameraRouter = createTRPCRouter({
  open: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "homeAssistant"))
    .input(
      z.object({
        entityId: z
          .string()
          .max(255)
          .regex(/^camera\.[a-z0-9_]+$/),
      }),
    )
    .query(async ({ ctx: { integration }, input, signal }) => {
      const instance = await createIntegrationAsync(integration);
      try {
        return await instance.getCameraStreamAsync(input.entityId, signal);
      } catch {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "The camera stream is unavailable" });
      }
    }),
});
