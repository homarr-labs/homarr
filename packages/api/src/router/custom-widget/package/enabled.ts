import { TRPCError } from "@trpc/server";

import { eq } from "@homarr/db";
import { customWidgetInstallations } from "@homarr/db/schema";

import { withWidgetInstallationLock } from "./coordination";
import { publishWidgetPackageChange } from "./events";
import { getWidgetPackageSupervisor } from "./invocations";
import { getArtifact, getInstallation, getPackagePlacements } from "./records";
import type { PackageContext } from "./types";

export async function setWidgetPackageEnabled(ctx: PackageContext, id: string, enabled: boolean) {
  await getInstallation(ctx, id);
  const notify = async () =>
    publishWidgetPackageChange({
      installationId: id,
      itemIds: [id, ...(await getPackagePlacements(ctx, id)).map(({ id: itemId }) => itemId)],
      kind: enabled ? "activation" : "disabled",
    });
  if (!enabled) {
    // Stop new dispatch and cancel running actions before waiting for their mutation lease.
    await ctx.db
      .update(customWidgetInstallations)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(customWidgetInstallations.id, id));
    await notify();
  }
  await withWidgetInstallationLock(id, async (signal) => {
    const installation = await getInstallation(ctx, id);
    if (enabled) {
      if (!installation.activeArtifactId)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Activate a package first" });
      const { artifact } = await getArtifact(ctx, installation.activeArtifactId);
      getWidgetPackageSupervisor().resetFailures(artifact.digest);
      await getWidgetPackageSupervisor().preflight({ artifact });
    }
    signal.throwIfAborted();
    await ctx.db
      .update(customWidgetInstallations)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(customWidgetInstallations.id, id));
    await notify();
  });
}
