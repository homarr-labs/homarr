import { analyseOldmarrImportForRouterAsync, analyseOldmarrImportInputSchema } from "@homarr/old-import/analyse";
import {
  ensureValidTokenOrThrow,
  importInitialOldmarrAsync,
  importInitialOldmarrInputSchema,
} from "@homarr/old-import/import";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const importRouter = createTRPCRouter({
  analyseInitialOldmarrImport: publicProcedure.input(analyseOldmarrImportInputSchema).mutation(async ({ input }) => {
    return await analyseOldmarrImportForRouterAsync(input);
  }),
  validateToken: publicProcedure
    .input(
      z.object({
        checksum: z.string(),
        token: z.string(),
      }),
    )
    .mutation(({ input }) => {
      try {
        ensureValidTokenOrThrow(input.checksum, input.token);
        return true;
      } catch {
        return false;
      }
    }),
  importInitialOldmarrImport: publicProcedure
    .input(importInitialOldmarrInputSchema)
    .mutation(async ({ ctx, input }) => {
      await importInitialOldmarrAsync(ctx.db, input);
    }),
});
