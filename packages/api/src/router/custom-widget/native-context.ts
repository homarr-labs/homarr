import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import { collectCustomWidgetRequestReferences } from "@homarr/custom-widgets/core";
import type { CustomWidgetNativeCapability } from "@homarr/custom-widgets/core";
import { eq } from "@homarr/db";
import { boards } from "@homarr/db/schema";

import type { createTRPCContext } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { resolvePlacedDefinitionAsync } from "./placed-definition";
import { getPreviewSession } from "./preview-sessions";
import { isNativeCapabilityId, nativeCapabilities } from "./native-catalog";

export type NativeContext = ReturnType<typeof createTRPCContext>;
export const nativeInputSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    previewSessionId: z.string().min(1).optional(),
    nativeId: z.string().min(1).max(64),
    params: z.record(z.string().max(64), z.union([z.string().max(8192), z.number().finite(), z.boolean()])).default({}),
  })
  .refine(
    (value) => Boolean(value.itemId) !== Boolean(value.previewSessionId),
    "Choose one widget item or preview session",
  );

function resolveInput(
  value: unknown,
  options: Record<string, unknown>,
  params: Record<string, unknown>,
  depth = 0,
): unknown {
  if (depth > 12) throw new TRPCError({ code: "BAD_REQUEST", message: "Native input is too deeply nested" });
  if (Array.isArray(value)) return value.map((entry) => resolveInput(entry, options, params, depth + 1));
  if (!isRecord(value)) return value;
  if (typeof value.$option === "string") return options[value.$option];
  if (typeof value.$param === "string") return params[value.$param];
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, resolveInput(entry, options, params, depth + 1)]),
  );
}

export async function resolveNative(
  ctx: NativeContext,
  input: z.infer<typeof nativeInputSchema>,
  kind: "query" | "action",
) {
  const preview = input.previewSessionId;
  let session;
  let descriptor: CustomWidgetNativeCapability | undefined;
  let options: Record<string, unknown>;
  let definitionId: string;
  if (preview) {
    if (!ctx.session?.user.permissions.includes("admin")) throw new TRPCError({ code: "FORBIDDEN" });
    session = await getPreviewSession(preview, ctx.session.user.id);
    descriptor = session.extensions?.native?.[input.nativeId];
    options = session.options;
    definitionId = session.definitionId ?? `preview:${preview}`;
  } else {
    if (!input.itemId) throw new TRPCError({ code: "BAD_REQUEST", message: "Widget item is required" });
    const resolved = await resolvePlacedDefinitionAsync(ctx, input.itemId);
    descriptor = resolved.definition.extensions?.native?.[input.nativeId];
    options = resolved.configuration;
    definitionId = resolved.stored.id;
    if (descriptor) await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), descriptor.permission);
  }
  if (!descriptor || descriptor.kind !== kind || !isNativeCapabilityId(descriptor.capability)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Native capability is unavailable" });
  }
  const capability = descriptor.capability;
  const contract = nativeCapabilities[capability];
  if (contract.kind !== kind)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Native capability kind does not match" });
  const integrationIds: string[] = [];
  if (contract.integration) {
    const configured = options[descriptor.integrationOption ?? ""];
    if (typeof configured === "string" && configured) integrationIds.push(configured);
    else if (Array.isArray(configured) && configured.every((id) => typeof id === "string" && id))
      integrationIds.push(...configured);
    if (!integrationIds.length || integrationIds.length > 16)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Configure the native capability's integration option",
      });
  }
  const expectedParams = collectCustomWidgetRequestReferences({ path: "", body: descriptor.input }).params;
  if (
    Object.keys(input.params).some((name) => !expectedParams.has(name)) ||
    [...expectedParams].some((name) => !Object.hasOwn(input.params, name))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Supply exactly the native capability's declared invocation parameters",
    });
  }
  const values = contract.input.parse(resolveInput(descriptor.input, options, input.params));
  return { capability, descriptor, values, integrationIds, definitionId, session };
}
export type ResolvedNative = Awaited<ReturnType<typeof resolveNative>>;
