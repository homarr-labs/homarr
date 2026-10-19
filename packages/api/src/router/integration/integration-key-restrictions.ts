import { Buffer } from "node:buffer";
import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { integrationEndpointPathSchema } from "@homarr/validation/api-key";

interface RestrictedRequestInput {
  integrationId?: string;
  integrationName?: string;
  integrationKind?: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

const denyIntegrationKeyRequest = () => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This request is outside the API key's approved GET/HEAD endpoints",
  });
};

export function assertIntegrationKeyRequestAllowed(
  session: Session,
  input: RestrictedRequestInput,
  integration: { id: string; url: string; kind: string },
) {
  const restrictions = session.apiKeyRestrictions;
  if (!restrictions) return;
  if (!input.integrationId || input.integrationName !== undefined || input.integrationKind !== undefined)
    denyIntegrationKeyRequest();
  if (input.headers !== undefined || input.body !== undefined) denyIntegrationKeyRequest();
  const queryStart = input.path.indexOf("?");
  let path = input.path;
  let query = "";
  if (queryStart !== -1) {
    path = input.path.slice(0, queryStart);
    query = input.path.slice(queryStart + 1);
  }
  if (!integrationEndpointPathSchema.safeParse(path).success || Buffer.byteLength(query) > 2048)
    denyIntegrationKeyRequest();
  const parameters = [...new URLSearchParams(query)];
  if (parameters.length > 16 || new Set(parameters.map(([name]) => name)).size !== parameters.length)
    denyIntegrationKeyRequest();
  const allowed = restrictions.endpoints.some((rule) => {
    if (
      rule.integrationId !== integration.id ||
      rule.integrationUrl !== integration.url ||
      rule.integrationKind !== integration.kind ||
      rule.path !== path ||
      !rule.methods.some((method) => method === input.method)
    )
      return false;
    if (parameters.length !== rule.query.length) return false;
    return parameters.every(([name, value]) =>
      rule.query.some((parameter) => parameter.name === name && parameter.values.includes(value)),
    );
  });
  if (!allowed) denyIntegrationKeyRequest();
}
