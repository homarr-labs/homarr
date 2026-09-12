import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { customWidgetArtifacts } from "@homarr/db/schema";
import { customWidgetArtifactSchema, customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { assertWidgetArtifactIntegrity } from "@homarr/custom-widgets/package/server";

import { getArtifact, getInstallation, readPackageDraft } from "./records";
import { widgetPackageAdminProcedure } from "./procedure";
import { getWidgetPackageSupervisor } from "./invocations";

export const packageArtifactReviewProcedures = {
  runtimeStatus: widgetPackageAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const installation = await getInstallation(ctx, input.id);
      if (!installation.activeArtifactId) return { state: "unactivated" as const };
      const { artifact } = await getArtifact(ctx, installation.activeArtifactId);
      if (!artifact.server) return { state: "browserOnly" as const };
      return getWidgetPackageSupervisor().inspect(artifact.digest);
    }),
  inspectArtifact: widgetPackageAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const installation = await getInstallation(ctx, input.id);
      const parsed = customWidgetPackageSchema.safeParse(readPackageDraft(installation.draft));
      let artifact = null;
      if (parsed.success) {
        const row = await ctx.db.query.customWidgetArtifacts.findFirst({
          where: eq(customWidgetArtifacts.source, JSON.stringify(parsed.data)),
        });
        if (row) {
          artifact = customWidgetArtifactSchema.parse(JSON.parse(row.artifact));
          assertWidgetArtifactIntegrity(artifact, parsed.data);
        }
      }
      let activeArtifact = null;
      if (installation.activeArtifactId)
        activeArtifact = (await getArtifact(ctx, installation.activeArtifactId)).artifact;
      return { artifact, activeArtifact };
    }),
};
