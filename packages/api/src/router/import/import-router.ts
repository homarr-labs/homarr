import { analyseOldmarrImportForRouterAsync, analyseOldmarrImportInputSchema } from "@homarr/old-import/analyse";
import { importInitialOldmarrAsync, importInitialOldmarrInputSchema } from "@homarr/old-import/import";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const importRouter = createTRPCRouter({
  analyseInitialOldmarrImport: publicProcedure.input(analyseOldmarrImportInputSchema).mutation(async ({ input }) => {
    return await analyseOldmarrImportForRouterAsync(input);
  }),
  importInitialOldmarrImport: publicProcedure
    .input(importInitialOldmarrInputSchema)
    .mutation(async ({ ctx, input }) => {
      await importInitialOldmarrAsync(ctx.db, input);
    }),
});
