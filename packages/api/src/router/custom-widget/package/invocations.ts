import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createId } from "@homarr/common";
import { customWidgetActivity } from "@homarr/db/schema";
import { CustomWidgetPackageSupervisor } from "@homarr/custom-widgets/package/server";

import { env } from "../../../env";
import { BoundedAsyncQueue } from "../../widgets/bounded-async-queue";
import { acquireCustomWidgetRequestLimit } from "../request-limits";
import { authorizePackageHandler } from "./permissions";
import { resolvePackagePlacement } from "./records";
import { createWidgetSdkBridge } from "./sdk-bridge";
import { observeWidgetPackageChanges } from "./events";
import { withWidgetInstallationLock } from "./coordination";
import { getWidgetPackageDirectory } from "./paths";
import type { PackageContext } from "./types";
import type { ResolvedPackagePlacement } from "./records";
import { observeWidgetInvocationAuthorization, refreshWidgetActor } from "./authorization";

const logger = createLogger({ module: "custom-widget-package" });
let supervisor: CustomWidgetPackageSupervisor | undefined;
export function getWidgetPackageSupervisor() {
  if (!supervisor) {
    const currentSupervisor = new CustomWidgetPackageSupervisor({
      rootDirectory: getWidgetPackageDirectory(),
      maximumProcesses: env.CUSTOM_WIDGET_MAX_SERVER_PROCESSES,
    });
    supervisor = currentSupervisor;
    observeWidgetPackageChanges((change) => {
      if (change.kind === "storage") return;
      void currentSupervisor
        .cancelInstances(change.itemIds, { actions: change.kind === "disabled" })
        .catch(() => logger.warn("Widget retirement failed"));
    });
  }
  return supervisor;
}

export const packageOperationInputSchema = z
  .object({
    itemId: z.string().min(1),
    name: z.string().min(1).max(128),
    input: z.unknown().default({}),
  })
  .refine((value) => (JSON.stringify(value.input) ?? "null").length <= 1_048_576, "Widget inputs exceed 1 MiB");
type OperationInput = z.infer<typeof packageOperationInputSchema>;

export { validatePackageHandlerInput } from "./handler-validation";
import { validatePackageHandlerInput } from "./handler-validation";

export async function invokePackageHandler(
  ctx: PackageContext,
  input: OperationInput,
  kind: "query" | "action",
  signal?: AbortSignal,
  beforeInvoke?: (ctx: PackageContext, resolved: ResolvedPackagePlacement) => Promise<void>,
) {
  const placement = await resolvePackagePlacement(ctx, input.itemId);
  if (kind === "action")
    return withWidgetInstallationLock(
      placement.installation.id,
      (operationSignal) => executePackageHandler(ctx, input, kind, operationSignal, beforeInvoke),
      signal,
    );
  return executePackageHandler(ctx, input, kind, signal, beforeInvoke);
}

async function executePackageHandler(
  ctx: PackageContext,
  input: OperationInput,
  kind: "query" | "action",
  signal?: AbortSignal,
  beforeInvoke?: (ctx: PackageContext, resolved: ResolvedPackagePlacement) => Promise<void>,
) {
  ctx = await refreshWidgetActor(ctx);
  const resolved = await resolvePackagePlacement(ctx, input.itemId);
  await beforeInvoke?.(ctx, resolved);
  const { handler, guest } = await authorizePackageHandler(ctx, resolved, input.name, kind, input.input);
  validatePackageHandlerInput(handler, input.input);
  let release: (() => Promise<void>) | undefined;
  let status = "success";
  const authorization = await observeWidgetInvocationAuthorization(ctx, resolved, { ...input, kind }, signal);
  try {
    if (guest)
      release = await acquireCustomWidgetRequestLimit({
        category: "action",
        itemId: input.itemId,
        definitionId: resolved.installation.id,
      });
    const result = await getWidgetPackageSupervisor().invoke({
      artifact: resolved.artifact,
      instanceId: resolved.item.id,
      boardId: resolved.item.boardId,
      userId: ctx.session?.user.id,
      handler: input.name,
      input: input.input,
      signal: authorization.signal,
      sdk: createWidgetSdkBridge(ctx, resolved, kind, guest, authorization.signal),
    });
    // A query may have been waiting upstream while its viewer lost access.
    if (kind === "query") await authorization.check();
    return result;
  } catch (error) {
    status = "failed";
    throw normalizeWidgetInvocationError(error);
  } finally {
    authorization.close();
    await release?.();
    if (kind === "action") {
      await ctx.db
        .insert(customWidgetActivity)
        .values({
          id: createId(),
          installationId: resolved.installation.id,
          itemId: resolved.item.id,
          userId: ctx.session?.user.id,
          handler: input.name,
          status,
          createdAt: new Date(),
        })
        .catch(() =>
          logger.warn("Widget action activity could not be recorded", {
            installationId: resolved.installation.id,
            handler: input.name,
          }),
        );
    }
  }
}

export async function* subscribePackageHandler(ctx: PackageContext, input: OperationInput, signal?: AbortSignal) {
  ctx = await refreshWidgetActor(ctx);
  const resolved = await resolvePackagePlacement(ctx, input.itemId);
  const { handler } = await authorizePackageHandler(ctx, resolved, input.name, "subscription", input.input);
  validatePackageHandlerInput(handler, input.input);
  const queue = new BoundedAsyncQueue<unknown>(32);
  const authorization = await observeWidgetInvocationAuthorization(
    ctx,
    resolved,
    { ...input, kind: "subscription" },
    signal,
  );
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
    queue.fail(authorization.signal.reason ?? new Error("Widget subscription ended"));
  };
  authorization.signal.addEventListener("abort", onAbort, { once: true });
  if (authorization.signal.aborted) onAbort();
  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = await getWidgetPackageSupervisor().subscribe({
      artifact: resolved.artifact,
      instanceId: resolved.item.id,
      boardId: resolved.item.boardId,
      userId: ctx.session?.user.id,
      handler: input.name,
      input: input.input,
      signal: controller.signal,
      sdk: createWidgetSdkBridge(ctx, resolved, "subscription", false, controller.signal),
      onData: (data) => queue.push(data),
      onError: (error) => queue.fail(normalizeWidgetInvocationError(error)),
      onComplete: () => queue.close(),
    });
    yield* queue;
  } finally {
    authorization.signal.removeEventListener("abort", onAbort);
    authorization.close();
    controller.abort();
    unsubscribe?.();
    queue.close();
  }
}

export function normalizeWidgetInvocationError(error: unknown) {
  if (error instanceof TRPCError) return error;
  if (error instanceof Error && "code" in error) {
    const code = z
      .enum(["FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND", "PRECONDITION_FAILED", "BAD_REQUEST", "TOO_MANY_REQUESTS"])
      .safeParse(error.code);
    if (code.success) return new TRPCError({ code: code.data, message: error.message });
  }
  return error;
}
