import { setTimeout as delay } from "node:timers/promises";
import { TRPCError } from "@trpc/server";

import { observeWidgetPackageChanges } from "./events";
import { resolvePackagePreview } from "./preview-store";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";

/** Scenario queries never invoke package server code or fall back to a configured connection. */
export async function executeWidgetPreviewFixture(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  name: string,
  signal?: AbortSignal,
) {
  const preview = resolved.preview;
  const scenario = preview?.scenario;
  if (!scenario) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Choose a preview scenario first" });
  const fixture = resolved.source.previewScenarios?.[scenario]?.queries[name];
  if (!fixture)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Preview scenario '${scenario}' has no fixture for query '${name}'`,
    });
  const controller = new AbortController();
  const cancellation = controller.signal;
  const combined = signal ? AbortSignal.any([signal, cancellation]) : cancellation;
  const unsubscribe = observeWidgetPackageChanges((change) => {
    if (change.kind === "disabled" && change.itemIds.includes(resolved.item.id))
      controller.abort(new TRPCError({ code: "NOT_FOUND", message: "Preview session was discarded" }));
  });
  try {
    combined.throwIfAborted();
    if (fixture.delayMs) await delay(fixture.delayMs, undefined, { signal: combined });
    combined.throwIfAborted();
    await resolvePackagePreview(ctx, preview.id);
    if ("error" in fixture)
      throw new TRPCError({ code: fixture.error.code ?? "INTERNAL_SERVER_ERROR", message: fixture.error.message });
    return fixture.data;
  } catch (error) {
    if (combined.aborted) throw combined.reason;
    throw error;
  } finally {
    unsubscribe();
  }
}
