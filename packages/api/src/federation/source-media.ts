import { Buffer } from "node:buffer";
import { z } from "zod/v4";

import { splitToChunksWithNItems } from "@homarr/common";
import { createKeyedFingerprint, verifyKeyedFingerprint } from "@homarr/common/server";
import { getImageIntegrationIdAsync, ImageProxy, isImageFromIntegrationsAsync } from "@homarr/image-proxy";

import { ApiError } from "../procedure";
import type { ApiContext } from "../procedure";
import { assertSourceImageBounds } from "./source-media-image";

const signingPrefix = "homarr-federation-source-media-v1:";
const imageReference = /^\/api\/image-proxy\/([A-Za-z0-9_-]{1,256})$/u;
const mediaTokenSchema = z.strictObject({
  v: z.literal(1),
  grantId: z.string().min(1).max(256),
  integrationId: z.string().min(1).max(128),
  assetId: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/u),
  expiresAt: z.number().int().positive(),
});
export const MAX_SOURCE_MEDIA_BYTES = 8 * 1024 * 1024;
const denied = () => new ApiError({ code: "FORBIDDEN", message: "Source media capability is invalid or expired" });

function serviceScope(context: ApiContext, integrationId: string) {
  const access = context.workerAccess;
  if (access?.role !== "service" || !access.service?.integrationIds.includes(integrationId)) {
    throw new ApiError({ code: "FORBIDDEN", message: "Source media requires its integration service grant" });
  }
  return access;
}

/** Only references produced by an already-authorized native result can be signed. */
export async function signSourceMediaResult(
  context: ApiContext,
  selectedIds: string[],
  result: unknown,
): Promise<unknown> {
  const integrationId = selectedIds[0];
  if (!integrationId || context.workerAccess?.role !== "service") return result;
  const access = serviceScope(context, integrationId);
  const signatures = new Map<string, Promise<string>>();
  let activeLookups = 0;
  const waitingLookups: Array<() => void> = [];
  const getAssetScope = async (assetId: string) => {
    if (activeLookups < 16) activeLookups++;
    else await new Promise<void>((resolve) => waitingLookups.push(resolve));
    try {
      return await getImageIntegrationIdAsync(assetId);
    } finally {
      const next = waitingLookups.shift();
      if (next) next();
      else activeLookups--;
    }
  };
  const sign = (assetId: string) => {
    const existing = signatures.get(assetId);
    if (existing) return existing;
    if (signatures.size >= 2000)
      throw new ApiError({ code: "PAYLOAD_TOO_LARGE", message: "Native result contains too many media references" });
    const signed = (async () => {
      const assetIntegrationId = await getAssetScope(assetId);
      if (!assetIntegrationId || !selectedIds.includes(assetIntegrationId))
        throw new ApiError({ code: "FORBIDDEN", message: "Native media does not belong to the selected integrations" });
      serviceScope(context, assetIntegrationId);
      const encoded = Buffer.from(
        JSON.stringify({
          v: 1,
          grantId: access.grantId,
          integrationId: assetIntegrationId,
          assetId,
          expiresAt: Date.now() + 300_000,
        }),
      ).toString("base64url");
      return `/api/federation/source-media/${encoded}.${createKeyedFingerprint(signingPrefix + encoded)}`;
    })();
    signatures.set(assetId, signed);
    return signed;
  };
  if (result && typeof result === "object" && Symbol.asyncIterator in result) {
    return (async function* () {
      for await (const value of result as AsyncIterable<unknown>)
        yield await signSourceMediaResult(context, selectedIds, value);
    })();
  }
  let nodes = 0;
  const visit = async (value: unknown, depth: number): Promise<unknown> => {
    if (++nodes > 100_000 || depth > 64)
      throw new ApiError({ code: "PAYLOAD_TOO_LARGE", message: "Native result exceeds the media projection limit" });
    if (typeof value === "string") {
      const match = imageReference.exec(value);
      if (match?.[1]) return sign(match[1]);
      return value;
    }
    if (Array.isArray(value)) {
      const projected: unknown[] = [];
      for (const batch of splitToChunksWithNItems(value, 16))
        projected.push(...(await Promise.all(batch.map((entry) => visit(entry, depth + 1)))));
      return projected;
    }
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      const projected: Array<[string, unknown]> = [];
      for (const batch of splitToChunksWithNItems(Object.entries(value), 16))
        projected.push(
          ...(await Promise.all(
            batch.map(async ([key, child]): Promise<[string, unknown]> => [key, await visit(child, depth + 1)]),
          )),
        );
      return Object.fromEntries(projected);
    }
    return value;
  };
  return visit(result, 0);
}

export async function readFederatedSourceMedia(
  context: ApiContext,
  integrationId: string,
  token: string,
  signal?: AbortSignal,
) {
  const access = serviceScope(context, integrationId);
  if (token.length > 2048) throw denied();
  const [encoded, signature, extra] = token.split(".");
  if (
    !encoded ||
    !signature ||
    extra ||
    !/^[A-Za-z0-9_-]+$/u.test(encoded) ||
    !/^[a-f0-9]{64}$/u.test(signature) ||
    !verifyKeyedFingerprint(signingPrefix + encoded, signature)
  )
    throw denied();
  let payload: z.infer<typeof mediaTokenSchema>;
  try {
    payload = mediaTokenSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  } catch {
    throw denied();
  }
  if (
    payload.grantId !== access.grantId ||
    payload.integrationId !== integrationId ||
    payload.expiresAt <= Date.now() ||
    payload.expiresAt > Date.now() + 300_000
  )
    throw denied();
  const authorization = {
    path: "federation.media",
    kind: "query" as const,
    integrationIds: [integrationId],
    input: { integrationId, token },
  };
  await access.authorizeProcedure(authorization);
  if (!(await isImageFromIntegrationsAsync(payload.assetId, [integrationId]))) throw denied();
  const result = await new ImageProxy().forwardImageAsync(payload.assetId, signal);
  await access.authorizeProcedure(authorization);
  if (payload.expiresAt <= Date.now()) throw denied();
  if ("error" in result) throw new ApiError({ code: "BAD_GATEWAY", message: "Source image is unavailable" });
  if (result.image.byteLength > MAX_SOURCE_MEDIA_BYTES)
    throw new ApiError({ code: "PAYLOAD_TOO_LARGE", message: "Source image exceeds the 8 MiB limit" });
  const contentType = result.contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  assertSourceImageBounds(new Uint8Array(result.image), contentType);
  return { data: Buffer.from(result.image).toString("base64url"), contentType, size: result.image.byteLength };
}
