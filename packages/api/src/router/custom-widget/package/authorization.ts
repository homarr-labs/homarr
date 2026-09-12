import { TRPCError } from "@trpc/server";

import { getBindingsDigest } from "./connections";
import { authorizePackageHandler } from "./permissions";
import { packageDigest, resolvePackagePlacement } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";

export { refreshWidgetActor } from "./actor";
import { refreshWidgetActor } from "./actor";

export async function observeWidgetInvocationAuthorization(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  operation: { name: string; input: unknown; kind: "query" | "action" | "subscription" },
  outerSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const bindingDigest = await getBindingsDigest(ctx, resolved.bindings);
  let checking: Promise<void> | undefined;
  const abort = () => controller.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", abort, { once: true });
  if (outerSignal?.aborted) abort();
  const check = () => {
    checking ??= (async () => {
      const actor = await refreshWidgetActor(ctx);
      const current = await resolvePackagePlacement(actor, resolved.item.id);
      await authorizePackageHandler(actor, current, operation.name, operation.kind, operation.input);
      if (
        current.installation.id !== resolved.installation.id ||
        current.artifact.digest !== resolved.artifact.digest ||
        packageDigest(current.configuration) !== packageDigest(resolved.configuration) ||
        (await getBindingsDigest(actor, current.bindings)) !== bindingDigest
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "Widget placement changed; reload it before continuing" });
      }
    })()
      .catch((error: unknown) => {
        controller.abort(error);
        throw error;
      })
      .finally(() => {
        checking = undefined;
      });
    return checking;
  };
  const timer = setInterval(() => {
    void check().catch(() => undefined);
  }, 15_000);
  timer.unref();
  return {
    signal: controller.signal,
    check,
    close: () => {
      clearInterval(timer);
      outerSignal?.removeEventListener("abort", abort);
      controller.abort();
    },
  };
}
