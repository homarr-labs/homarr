import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { importFullConfigAsync, parseAndValidateBundle, previewImportFullConfigAsync } from "@homarr/board-portability";
import { onboarding } from "@homarr/db/schema";
import { analyseOldmarrImportForRouterAsync, analyseOldmarrImportInputSchema } from "@homarr/old-import/analyse";
import {
  ensureValidTokenOrThrow,
  importInitialOldmarrAsync,
  importInitialOldmarrInputSchema,
} from "@homarr/old-import/import";

import packageJson from "../../../../../package.json";
import { createTRPCRouter, onboardingProcedure } from "../../trpc";
import { nextOnboardingStepAsync } from "../onboard/onboard-queries";

export const importRouter = createTRPCRouter({
  analyseInitialOldmarrImport: onboardingProcedure
    .requiresStep("import")
    .input(analyseOldmarrImportInputSchema)
    .mutation(async ({ input }) => {
      return await analyseOldmarrImportForRouterAsync(input);
    }),
  validateToken: onboardingProcedure
    .requiresStep("import")
    .input(z.object({ checksum: z.string(), token: z.string() }))
    .mutation(({ input }) => {
      try {
        ensureValidTokenOrThrow(input.checksum, input.token);
        return true;
      } catch {
        return false;
      }
    }),
  importInitialOldmarrImport: onboardingProcedure
    .requiresStep("import")
    .input(importInitialOldmarrInputSchema)
    .mutation(async ({ ctx, input }) => {
      await importInitialOldmarrAsync(ctx.db, input);
      await nextOnboardingStepAsync(ctx.db, undefined);
    }),
  previewInitialConfigImport: onboardingProcedure
    .requiresStep("import")
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await previewImportFullConfigAsync(ctx.db, input.content, packageJson.version);
    }),
  importInitialConfigImport: onboardingProcedure
    .requiresStep("import")
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const bundle = parseAndValidateBundle(input.content, packageJson.version);
        await importFullConfigAsync(ctx.db, bundle, null);

        const hasUsers = (bundle.users ?? []).length > 0;
        if (hasUsers) {
          await ctx.db.update(onboarding).set({ previousStep: "import", step: "finish" });
        } else {
          await nextOnboardingStepAsync(ctx.db, undefined);
        }
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid config" });
      }
    }),
});
