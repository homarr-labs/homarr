import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { customWidgetArtifacts } from "@homarr/db/schema";
import { customWidgetArtifactSchema, customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { assertWidgetArtifactIntegrity } from "@homarr/custom-widgets/package/server";

import { getArtifact, getInstallation, readPackageDraft } from "./records";
import { widgetPackageAdminProcedure } from "./procedure";

export const packageArtifactReviewProcedures = {
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
