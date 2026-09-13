import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { beszelRouter } from "../widgets/beszel";
import { nativeCapabilities } from "./native-catalog";
import { nativeInputSchema, resolveNative } from "./native-context";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { executeNative, recordNativePreview } from "./native-execution";

export const nativeProcedures = {
  nativeCapabilities: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Discover the curated native Custom Widget capabilities and their input schemas. These reuse existing integration permissions. Declare them in v3 extensions.native; select integrations through saved widget options.",
      },
    })
    .query(() =>
      Object.entries(nativeCapabilities).map(([id, capability]) => ({
        id,
        kind: capability.kind,
        integration: capability.integration,
        integrationKinds:
          capability.integration === "calendar"
            ? getIntegrationKindsByCategory("calendar")
            : capability.integration === "mediaRequest"
              ? getIntegrationKindsByCategory("mediaRequest")
              : capability.integration
                ? [capability.integration]
                : [],
        inputSchema: z.toJSONSchema(capability.input, { io: "input" }),
      })),
    ),
  nativeQuery: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Run a declared v3 native query for a widget item or owned preview session. Use nativeCapabilities for discovery. Supply exactly one itemId or previewSessionId and the declared nativeId.",
      },
    })
    .input(nativeInputSchema)
    .query(({ ctx, input }) => executeNative(ctx, input, "query")),
  nativeAction: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Run a declared native action for a widget item or owned preview session. Preview actions simulate unless live actions were explicitly enabled. Live actions require confirmed=true and existing board/integration permissions.",
      },
    })
    .input(nativeInputSchema.safeExtend({ confirmed: z.boolean().default(false) }))
    .mutation(({ ctx, input }) => executeNative(ctx, input, "action", input.confirmed)),
  nativeSubscribe: publicProcedure.input(nativeInputSchema).subscription(async function* ({ ctx, input, signal }) {
    const resolved = await resolveNative(ctx, input, "query");
    if (resolved.capability !== "beszel.live")
      throw new TRPCError({ code: "BAD_REQUEST", message: "This capability has no live stream" });
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    // A preview cannot retain service access after its session expires.
    const remaining = Math.min(50_000, (resolved.session?.expiresAt ?? Infinity) - Date.now());
    const release = await acquireCustomWidgetRequestLimit({
      category: "query",
      userId: ctx.session?.user.id,
      itemId: input.itemId ?? `preview:${input.previewSessionId}`,
      definitionId: resolved.definitionId,
    });
    const timer = setTimeout(abort, Math.max(0, remaining));
    const startedAt = Date.now();
    try {
      const stream = await beszelRouter.createCaller(ctx, { signal: controller.signal }).subscribeSystemStats({
        integrationIds: resolved.integrationIds,
        ...nativeCapabilities["beszel.live"].input.parse(resolved.values),
      });
      let recorded = false;
      for await (const event of stream) {
        if (!recorded) {
          await recordNativePreview(resolved, input.nativeId, startedAt, 200);
          recorded = true;
        }
        yield { ok: true, status: 200, data: event };
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      controller.abort();
      await release();
    }
  }),
};
