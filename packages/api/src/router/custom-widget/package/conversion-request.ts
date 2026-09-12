import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  customJsxRequestSchema,
  customWidgetSourceSchema,
  getCustomWidgetConfirmation,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import {
  executeCustomWidgetRequest,
  invalidateCustomWidgetResponseCache,
  renderRequestBody,
  renderRequestTarget,
  resolveCustomWidgetRequestValues,
} from "@homarr/custom-widgets/server";

import { getBoundConnection } from "./connections";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";

const legacyRequestInput = z.object({
  requestId: z.string(),
  request: customJsxRequestSchema,
  sourceAuth: customWidgetSourceSchema.shape.auth,
  networkScope: customWidgetSourceSchema.shape.networkScope,
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  confirmed: z.boolean().default(false),
  optionValues: z.record(z.string(), z.unknown()).optional(),
});

export async function invokeLegacyWidgetRequest(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  kind: "query" | "action" | "subscription",
  input: unknown,
  signal?: AbortSignal,
) {
  const parsed = legacyRequestInput.parse(input);
  const { request, sourceAuth, params } = parsed;
  if (request.kind === "action" && kind !== "action")
    throw new TRPCError({ code: "FORBIDDEN", message: "Legacy actions require an action handler" });
  if (request.kind === "action" && getCustomWidgetConfirmation(request) && !parsed.confirmed)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Confirm this action before continuing" });
  signal?.throwIfAborted();
  const connection = await getBoundConnection(ctx, resolved.bindings, request.source);
  const baseUrl = connection.configuration.baseUrl;
  if (!baseUrl || connection.configuration.kind !== "http")
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The converted request needs an HTTP connection" });
  let configuration = resolved.configuration;
  if (parsed.optionValues) {
    if (
      request.kind !== "query" ||
      !Object.values(resolved.source.options).some((option) => option.choicesFrom?.request === parsed.requestId)
    )
      throw new TRPCError({ code: "FORBIDDEN", message: "Only declared configuration queries accept unsaved options" });
    configuration = { ...configuration, ...parsed.optionValues };
    if (validateCustomWidgetOptions(resolved.source.options, configuration).length > 0)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid widget configuration" });
  }
  const values = resolveCustomWidgetRequestValues(request, configuration, params);
  const secrets = { ...connection.secrets };
  if (sourceAuth === "bearer" && secrets.token) secrets.apiKey = secrets.token;
  if (typeof sourceAuth === "object") {
    const apiKey = secrets[sourceAuth.name];
    if (apiKey) secrets.apiKey = apiKey;
  }
  let type = "none";
  let headerName: string | undefined;
  if (request.auth !== "none") {
    if (typeof sourceAuth === "string") type = sourceAuth;
    else {
      type = sourceAuth.type;
      headerName = sourceAuth.name;
    }
  }
  const prefix = `converted:${resolved.installation.id}:${resolved.item.id}:${ctx.session?.user.id ?? "guest"}:`;
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        artifact: resolved.artifact.digest,
        values,
        configuration: connection.row.configuration,
        secrets: connection.row.encryptedSecrets,
      }),
    )
    .digest("hex");
  const response = await executeCustomWidgetRequest({
    baseUrl,
    targetUrl: renderRequestTarget(baseUrl, request, values),
    method: request.method,
    body: renderRequestBody(request, values),
    staticHeaders: request.headers,
    auth: {
      type,
      headerName,
      secrets: Object.entries(secrets).map(([secretKind, value]) => ({ kind: secretKind, value })),
    },
    networkScope: parsed.networkScope,
    kind: request.kind,
    cacheKey: `${prefix}${parsed.requestId}:${digest}`,
    cacheTtlSeconds: request.cacheSeconds ?? 0,
    signal,
  });
  if (request.kind === "action" && response.ok) invalidateCustomWidgetResponseCache([prefix]);
  return { ...response, invalidates: request.invalidates };
}
