import type { Database, eq } from "@homarr/db";
import type { medias } from "@homarr/db/schema";

import { createMediaBinaryResponse } from "./response";
import type { SanitizeSvg } from "./response";

export const mediaBinaryDisposition = Object.freeze({
  status: "held",
  sourceFile: "apps/nextjs/src/app/api/user-medias/[id]/route.ts",
  reason:
    "API sanitizer dependency declaration and actual Bun SVG security proof are required before native Fetch execution.",
} as const);

export const mediaBinaryDescriptor = Object.freeze({
  phase: "binary",
  path: "/api/user-medias",
  descendants: true,
  access: Object.freeze({ kind: "public" }),
} as const);

export interface MediaBinaryRequestContext {
  readonly request: Request;
  readonly signal: AbortSignal;
  onDispose(dispose: () => void | Promise<void>): void;
}

export interface MediaBinaryReadLease {
  readonly db: Database;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface MediaBinaryResources {
  readonly medias: typeof medias;
  readonly eq: typeof eq;
  readonly sanitizeSvg?: SanitizeSvg;
  acquireReadAsync(context: MediaBinaryRequestContext): Promise<MediaBinaryReadLease>;
}

export async function readMediaBinaryResponseAsync(
  resources: MediaBinaryResources,
  context: MediaBinaryRequestContext,
  requestParams: Readonly<{ id: string }>,
): Promise<Response> {
  const params = Object.freeze({ id: requestParams.id });
  const ifNoneMatch = context.request.headers.get("if-none-match");
  context.signal.throwIfAborted();
  const lease = await resources.acquireReadAsync(context);
  try {
    await lease.assertCurrentAsync();
    context.signal.throwIfAborted();
    const image = await lease.db.query.medias.findFirst({
      where: resources.eq(resources.medias.id, params.id),
      columns: { content: true, contentType: true },
    });
    await lease.assertCurrentAsync();
    context.signal.throwIfAborted();
    const response = createMediaBinaryResponse(image, ifNoneMatch, resources.sanitizeSvg);
    await lease.assertCurrentAsync();
    context.signal.throwIfAborted();
    return response;
  } finally {
    await lease.releaseAsync();
    context.signal.throwIfAborted();
  }
}
