import { Buffer } from "node:buffer";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { assertCustomWidgetPathScope, redactResponseSecrets } from "@homarr/custom-widgets/server";

import { getFederationOrigin } from "../../federation/client";
import { ApiError, protectedProcedure } from "../../procedure";
import type { IntegrationHttpContext } from "../integration/integration-http";
import { getIntegrationForHttpRequest, getIntegrationHttpConnection } from "../integration/integration-http";
import { executeCustomWidgetRequest, MAX_REQUEST_BODY_BYTES } from "./request-executor";

const operationSchema = z
  .strictObject({
    path: z.string().min(1).max(8192),
    method: z.enum(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]),
    kind: z.enum(["query", "action"]),
    body: z.string().max(MAX_REQUEST_BODY_BYTES).optional(),
    staticHeaders: z
      .record(
        z
          .string()
          .min(1)
          .max(128)
          .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u),
        z
          .string()
          .max(8192)
          .regex(/^[\t\x20-\x7e]*$/u),
      )
      .refine((headers) => Object.keys(headers).length <= 32, "Too many static headers")
      .optional(),
    authenticate: z.boolean(),
    textFallback: z.boolean().optional(),
  })
  .superRefine((operation, context) => {
    if (operation.body !== undefined && Buffer.byteLength(operation.body, "utf8") > MAX_REQUEST_BODY_BYTES) {
      context.addIssue({ code: "custom", path: ["body"], message: "Request body exceeds the 10 KiB limit" });
    }
    if (operation.staticHeaders && Buffer.byteLength(JSON.stringify(operation.staticHeaders), "utf8") > 8192) {
      context.addIssue({ code: "custom", path: ["staticHeaders"], message: "Static headers exceed the 8 KiB limit" });
    }
    if (operation.kind === "query" && operation.method === "DELETE") {
      context.addIssue({ code: "custom", path: ["kind"], message: "DELETE requests must be actions" });
    }
  });

export const federatedCustomWidgetSourceSchema = z.strictObject({
  integrationId: z.string().min(1).max(128),
  operation: operationSchema,
});

/** The path is a suffix of the source's private saved URL, never a supplied URL. */
export function resolveFederatedSourceTarget(baseUrl: string, path: string): URL {
  // eslint-disable-next-line no-control-regex -- Reject URL parser normalization of control characters.
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\s\u0000-\u001f\u007f#]/u.test(path)) {
    throw new ApiError({ code: "BAD_REQUEST", message: "Request must use a relative integration path" });
  }
  assertCustomWidgetPathScope({ pathname: path.split("?", 1)[0] ?? path }, "/");
  const suffix = new URL(path, "https://federated.invalid/");
  const target = new URL(baseUrl);
  const prefix = target.pathname;
  target.pathname = `${prefix.replace(/\/$/u, "")}${suffix.pathname}`;
  for (const [name, value] of suffix.searchParams) target.searchParams.set(name, value);
  assertCustomWidgetPathScope(target, prefix);
  return target;
}

export async function executeFederatedCustomWidgetSource(
  context: IntegrationHttpContext,
  input: z.infer<typeof federatedCustomWidgetSourceSchema>,
  signal?: AbortSignal,
) {
  // The native worker service guard also checks its scoped integration grant.
  // This ordinary permission check applies equally to browser and service calls.
  const integration = await getIntegrationForHttpRequest(context, input.integrationId);
  if (await getFederationOrigin(context, input.integrationId)) {
    throw new ApiError({ code: "FORBIDDEN", message: "An integration source cannot delegate to another worker" });
  }
  const connection = await getIntegrationHttpConnection(integration, input.operation.authenticate);
  const { authenticate: _authenticate, path, ...operation } = input.operation;
  const response = await executeCustomWidgetRequest({
    ...connection,
    ...operation,
    targetUrl: resolveFederatedSourceTarget(connection.baseUrl, path),
    signal,
  });
  // Even an unauthenticated endpoint may echo a saved credential. Those values
  // remain source-local regardless of whether authentication was requested.
  return {
    ...response,
    data: redactResponseSecrets(
      response.data,
      integration.secrets.map(({ kind, value }) => ({ kind, value: decryptSecret(value) })),
    ),
  };
}

export const federationSourceProcedures = {
  executeSource: protectedProcedure
    .meta({ integration: { action: "full", cardinality: "one" } })
    .input(federatedCustomWidgetSourceSchema)
    .mutation(({ context, input, signal }) => executeFederatedCustomWidgetSource(context, input, signal)),
};
