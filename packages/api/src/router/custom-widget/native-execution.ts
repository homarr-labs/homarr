import { TRPCError } from "@trpc/server";
import type { z } from "zod/v4";

import { isRecord } from "@homarr/common";

import { resolveNative } from "./native-context";
import type { nativeInputSchema, NativeContext, ResolvedNative } from "./native-context";
import { actionNative, queryNative } from "./native-dispatch";
import { acquireCustomWidgetRequestLimit } from "./request-limits";
import { appendPreviewJournal } from "./preview-sessions";

export async function recordNativePreview(
  resolved: ResolvedNative,
  nativeId: string,
  startedAt: number,
  status: number | null,
  simulated = false,
) {
  if (!resolved.session) return;
  await appendPreviewJournal(resolved.session, {
    requestId: `native:${nativeId}`,
    kind: resolved.descriptor.kind,
    method: resolved.descriptor.kind === "action" ? "POST" : "GET",
    path: resolved.capability,
    status,
    durationMs: Date.now() - startedAt,
    simulated,
  });
}

export async function executeNative(
  ctx: NativeContext,
  input: z.infer<typeof nativeInputSchema>,
  kind: "query" | "action",
  confirmed = false,
) {
  const resolved = await resolveNative(ctx, input, kind);
  const startedAt = Date.now();
  if (kind === "action" && resolved.session && !resolved.session.liveActions) {
    await recordNativePreview(resolved, input.nativeId, startedAt, null, true);
    return { ok: true, status: 0, data: null, simulated: true };
  }
  if (kind === "action" && !confirmed)
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This action requires confirmation" });
  const release = await acquireCustomWidgetRequestLimit({
    category: kind,
    userId: ctx.session?.user.id,
    itemId: input.itemId ?? `preview:${input.previewSessionId}`,
    definitionId: resolved.definitionId,
  });
  try {
    const data = kind === "query" ? await queryNative(ctx, resolved) : await actionNative(ctx, resolved);
    if (isRecord(data) && "error" in data && typeof data.error === "string") {
      await recordNativePreview(resolved, input.nativeId, startedAt, 502);
      return { ok: false, status: 502, data, error: data.error, simulated: false };
    }
    await recordNativePreview(resolved, input.nativeId, startedAt, 200);
    const invalidates: string[] = [];
    if (kind === "action") invalidates.push("*");
    return { ok: true, status: 200, data, simulated: false, invalidates };
  } catch (error) {
    await recordNativePreview(resolved, input.nativeId, startedAt, 0);
    throw error;
  } finally {
    await release();
  }
}
