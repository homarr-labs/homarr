import { widgetPackageAdminProcedure } from "./procedure";
import { getPreviewCapabilities } from "./capabilities";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";

import { BoundedAsyncQueue } from "../../widgets/bounded-async-queue";
import { getWidgetPackageSupervisor, validatePackageHandlerInput } from "./invocations";
import { getOrBuildWidgetArtifact } from "./transfer";
import {
  getPackagePreviewData,
  persistPackageArtifact,
  previewValue,
  resolvePackagePreview,
  savePackagePreview,
} from "./preview-store";
import { createWidgetSdkBridge } from "./sdk-bridge";
import { publishWidgetPackageChange } from "./events";
import { refreshWidgetActor } from "./authorization";
import { executeWidgetPreviewFixture } from "./preview-fixtures";
import { readWidgetStorage, writeWidgetStorage, widgetStorageInputSchema } from "./storage";

const admin = widgetPackageAdminProcedure;
const invocation = z.object({ previewId: z.string(), name: z.string(), input: z.unknown().default({}) });
const previewStorageInput = widgetStorageInputSchema.omit({ itemId: true }).extend({ previewId: z.string() });

export const packagePreviewProcedures = {
  previewStorageGet: admin.input(previewStorageInput).query(async ({ ctx, input }) => {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    return readWidgetStorage(ctx, resolved, { ...input, itemId: resolved.item.id });
  }),
  previewStorageSet: admin
    .input(previewStorageInput.extend({ value: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolvePackagePreview(ctx, input.previewId);
      return writeWidgetStorage(ctx, resolved, { ...input, value: input.value, itemId: resolved.item.id });
    }),
  previewGet: admin.input(z.object({ previewId: z.string() })).query(async ({ ctx, input }) => {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    return { previewId: input.previewId, displayData: getPackagePreviewData(resolved) };
  }),
  preview: admin
    .meta({
      mcp: {
        enabled: true,
        description:
          "Compile and preview explicit v3 source with named binding IDs. Requires admin and trusted:true for Homarr-level execution. Actions are simulated unless liveActions:true; does not activate dashboard placements.",
      },
    })
    .input(
      z.object({
        id: z.string(),
        source: z.record(z.string(), z.unknown()),
        trusted: z.literal(true),
        options: z.record(z.string(), z.unknown()).default({}),
        bindings: z.record(z.string(), z.string()).default({}),
        liveActions: z.boolean().default(false),
        scenario: z.string().min(1).max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = customWidgetPackageSchema.parse(input.source);
      if (input.scenario && !source.previewScenarios?.[input.scenario])
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a declared package preview scenario" });
      if (input.scenario && input.liveActions)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Fixture preview scenarios always simulate SDK actions" });
      const artifact = await getOrBuildWidgetArtifact(ctx, source);
      if (!input.scenario) await getWidgetPackageSupervisor().preflight({ artifact });
      await persistPackageArtifact(ctx, source, artifact);
      const previewId = createId();
      const resolved = await savePackagePreview(ctx, {
        id: previewId,
        installationId: input.id,
        artifactId: artifact.digest,
        options: input.options,
        bindings: input.bindings,
        liveActions: input.liveActions,
        scenario: input.scenario,
      });
      return { previewId, displayData: getPackagePreviewData(resolved) };
    }),
  discardPreview: admin.input(z.object({ previewId: z.string() })).mutation(async ({ ctx, input }) => {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    await previewValue(input.previewId, "null");
    await publishWidgetPackageChange({
      installationId: `preview-${input.previewId}`,
      itemIds: [resolved.item.id],
      kind: "disabled",
    });
  }),
  previewQuery: admin.input(invocation).query(async ({ ctx, input, signal }) => {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    if (input.name === "$capabilities") return getPreviewCapabilities(resolved);
    const handler = resolved.artifact.manifest.handlers[input.name];
    if (handler?.kind !== "query") throw new TRPCError({ code: "NOT_FOUND" });
    validatePackageHandlerInput(handler, input.input);
    if (resolved.preview?.scenario) return executeWidgetPreviewFixture(ctx, resolved, input.name, signal);
    return getWidgetPackageSupervisor().invoke({
      artifact: resolved.artifact,
      instanceId: resolved.item.id,
      boardId: resolved.item.boardId,
      userId: ctx.session.user.id,
      handler: input.name,
      input: input.input,
      signal,
      sdk: createWidgetSdkBridge(ctx, resolved, "query", false, signal),
    });
  }),
  previewAction: admin.input(invocation).mutation(async ({ ctx, input, signal }) => {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    const handler = resolved.artifact.manifest.handlers[input.name];
    if (handler?.kind !== "action") throw new TRPCError({ code: "NOT_FOUND" });
    validatePackageHandlerInput(handler, input.input);
    if (!resolved.preview?.liveActions) return { simulated: true, handler: input.name, input: input.input };
    return getWidgetPackageSupervisor().invoke({
      artifact: resolved.artifact,
      instanceId: resolved.item.id,
      boardId: resolved.item.boardId,
      userId: ctx.session.user.id,
      handler: input.name,
      input: input.input,
      signal,
      sdk: createWidgetSdkBridge(ctx, resolved, "action", false, signal),
    });
  }),
  previewSubscription: admin.input(invocation).subscription(async function* ({ ctx, input, signal }) {
    const resolved = await resolvePackagePreview(ctx, input.previewId);
    const handler = resolved.artifact.manifest.handlers[input.name];
    if (handler?.kind !== "subscription") throw new TRPCError({ code: "NOT_FOUND" });
    if (resolved.preview?.scenario)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Preview scenarios provide query fixtures; subscriptions are not connected in fixture mode",
      });
    validatePackageHandlerInput(handler, input.input);
    const queue = new BoundedAsyncQueue<unknown>(32);
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      queue.close();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const authorization = setInterval(() => {
      void refreshWidgetActor(ctx)
        .then((actor) => resolvePackagePreview(actor, input.previewId))
        .catch((error: unknown) => {
          queue.fail(error);
          controller.abort();
        });
    }, 15_000);
    authorization.unref();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = await getWidgetPackageSupervisor().subscribe({
        artifact: resolved.artifact,
        instanceId: resolved.item.id,
        boardId: resolved.item.boardId,
        userId: ctx.session.user.id,
        handler: input.name,
        input: input.input,
        signal: controller.signal,
        sdk: createWidgetSdkBridge(ctx, resolved, "subscription", false, controller.signal),
        onData: (data) => queue.push(data),
        onError: (error) => queue.fail(error),
        onComplete: () => queue.close(),
      });
      yield* queue;
    } finally {
      clearInterval(authorization);
      unsubscribe?.();
      abort();
      signal?.removeEventListener("abort", abort);
    }
  }),
};
