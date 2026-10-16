import { createKeyedFingerprint, verifyKeyedFingerprint } from "@homarr/common/server";
import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { eq, inArray } from "@homarr/db";
import {
  federationConnections,
  groupMembers,
  integrationGroupPermissions,
  integrationOrigins,
  integrationUserPermissions,
  integrations,
} from "@homarr/db/schema";
import { fromBase64Url, toBase64Url, utf8 } from "@homarr/remote-protocol";

import { ApiError } from "../procedure";
import type { ApiContext } from "../procedure";
import { callFederatedProcedure } from "./client";

const prefix = "homarr-federation-proxy-media-v1:";
const sourcePrefix = "/api/federation/source-media/";
interface MediaReference {
  version: 1;
  userId: string;
  grantId: string | null;
  connectionId: string;
  aliasId: string;
  integrationId: string;
  sourceToken: string;
  expiresAt: number;
}

/** Source-generated media capabilities become opaque paths bound to this primary session. */
export function rewriteFederatedMedia(
  context: ApiContext,
  connectionId: string,
  aliases: ReadonlyMap<string, string>,
  resultValue: unknown,
): unknown {
  let references = 0;
  function visit(value: unknown): unknown {
    if (typeof value === "string" && value.startsWith(sourcePrefix)) {
      if (++references > 2000 || !context.session)
        throw new ApiError({ code: "PAYLOAD_TOO_LARGE", message: "Too many federated media references" });
      const sourceToken = value.slice(sourcePrefix.length);
      const encodedSource = sourceToken.split(".")[0] ?? "";
      let source: { integrationId?: unknown; expiresAt?: unknown };
      try {
        source = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedSource, 2048)));
      } catch {
        throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker returned an invalid media capability" });
      }
      if (
        typeof source.integrationId !== "string" ||
        !aliases.has(source.integrationId) ||
        typeof source.expiresAt !== "number" ||
        !Number.isSafeInteger(source.expiresAt)
      )
        throw new ApiError({ code: "BAD_GATEWAY", message: "Source media is outside the requested integration scope" });
      const payload: MediaReference = {
        version: 1,
        userId: context.session.user.id,
        grantId: context.workerAccess?.grantId ?? null,
        connectionId,
        aliasId: aliases.get(source.integrationId) ?? "",
        integrationId: source.integrationId,
        sourceToken,
        expiresAt: Math.min(source.expiresAt, Date.now() + 300_000),
      };
      const encoded = toBase64Url(utf8(JSON.stringify(payload)));
      return `/api/federation/media/${encoded}.${createKeyedFingerprint(prefix + encoded)}`;
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]));
    return value;
  }
  return visit(resultValue);
}

export async function readFederatedMedia(context: ApiContext, token: string, request: Request): Promise<Response> {
  const reference = parseReference(context, token);
  await authorizeAlias(context, reference);
  const result = await callFederatedProcedure(
    context,
    reference.connectionId,
    ["federation", "media"],
    { integrationId: reference.integrationId, token: reference.sourceToken },
    { signal: request.signal },
  );
  // Revocation during an upstream read must not release completed bytes.
  parseReference(context, token);
  await authorizeAlias(context, reference);
  if (!result || typeof result !== "object")
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker returned invalid media" });
  const image = result as { data?: unknown; contentType?: unknown; size?: unknown };
  if (
    typeof image.data !== "string" ||
    typeof image.contentType !== "string" ||
    !/^image\/(?:png|jpeg|gif|webp|avif)$/u.test(image.contentType) ||
    typeof image.size !== "number" ||
    image.size > 8 * 1024 * 1024
  )
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker returned invalid media" });
  const bytes = fromBase64Url(image.data, 8 * 1024 * 1024);
  if (bytes.byteLength !== image.size)
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker returned invalid media" });
  return new Response(bytes, {
    headers: { "Content-Type": image.contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function parseReference(context: ApiContext, token: string): MediaReference {
  if (!context.session || token.length > 8192)
    throw new ApiError({ code: "UNAUTHORIZED", message: "Invalid federated media capability" });
  const [encoded, signature, extra] = token.split(".");
  if (
    !encoded ||
    !signature ||
    extra ||
    !/^[a-f0-9]{64}$/u.test(signature) ||
    !verifyKeyedFingerprint(prefix + encoded, signature)
  )
    throw new ApiError({ code: "UNAUTHORIZED", message: "Invalid federated media capability" });
  let value: MediaReference;
  try {
    value = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded, 6144))) as MediaReference;
  } catch {
    throw new ApiError({ code: "UNAUTHORIZED", message: "Invalid federated media capability" });
  }
  if (
    value.version !== 1 ||
    value.userId !== context.session.user.id ||
    value.grantId !== (context.workerAccess?.grantId ?? null) ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= Date.now()
  )
    throw new ApiError({ code: "FORBIDDEN", message: "Federated media expired or belongs to another session" });
  return value;
}

async function authorizeAlias(context: ApiContext, reference: MediaReference) {
  const connection = await context.db.query.federationConnections.findFirst({
    where: eq(federationConnections.id, reference.connectionId),
    columns: { enabled: true },
  });
  if (!connection?.enabled) throw new ApiError({ code: "FORBIDDEN", message: "Source worker connection is disabled" });
  const origin = await context.db.query.integrationOrigins.findFirst({
    where: eq(integrationOrigins.integrationId, reference.aliasId),
  });
  if (
    !origin ||
    origin.connectionId !== reference.connectionId ||
    origin.remoteIntegrationId !== reference.integrationId
  )
    throw new ApiError({ code: "FORBIDDEN", message: "Integration source changed" });
  const userId = context.session?.user.id ?? "";
  const groups = await context.db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    columns: { groupId: true },
  });
  const integration = await context.db.query.integrations.findFirst({
    where: eq(integrations.id, reference.aliasId),
    with: {
      items: { with: { item: true } },
      userPermissions: { where: eq(integrationUserPermissions.userId, userId) },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groups.map(({ groupId }) => groupId),
        ),
      },
    },
  });
  if (!integration || !(await hasQueryAccessToIntegrationsAsync(context.db, [integration], context.session)))
    throw new ApiError({ code: "FORBIDDEN", message: "Integration query permission required" });
  await context.workerAccess?.authorizeProcedure({
    path: "federation.media",
    kind: "query",
    integrationIds: [reference.aliasId],
    input: { integrationId: reference.aliasId, token: reference.sourceToken },
  });
}
