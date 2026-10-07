import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import type { createTRPCContext } from "../trpc";
import { mediaRouter } from "../router/medias/media-router";

const maxUploadBytes = 32 * 1024 * 1024;

export async function createMediaUploadResponseAsync(request: Request, ctx: ReturnType<typeof createTRPCContext>) {
  try {
    // Reject before buffering multipart data; the native caller checks authorization again.
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (!ctx.session.user.permissions.includes("media-upload")) throw new TRPCError({ code: "FORBIDDEN" });
    const contentType = request.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data;")) {
      throw new TRPCError({
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Expected multipart/form-data with files fields",
      });
    }
    const reader = request.body?.getReader();
    if (!reader) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload body is required" });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > maxUploadBytes) {
          await reader.cancel();
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Multipart body must not exceed 32 MiB" });
        }
        chunks.push(next.value as Uint8Array<ArrayBuffer>);
      }
    } finally {
      reader.releaseLock();
    }
    let formData: FormData;
    try {
      formData = await new Response(new Blob(chunks), { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid multipart body" });
    }
    const ids = await mediaRouter.createCaller(ctx).uploadMedia(formData);
    return Response.json(ids);
  } catch (cause) {
    let error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Media upload failed" });
    if (cause instanceof TRPCError) error = cause;
    return Response.json({ message: error.message, code: error.code }, { status: getHTTPStatusCodeFromError(error) });
  }
}

export const mediaUploadPaths = {
  "/api/media/upload": {
    post: {
      operationId: "media-uploadMedia",
      summary: "Upload images",
      tags: ["media"],
      security: [{ apikey: [] }],
      description:
        "Requires media-upload permission. Supply 1–32 files fields. Accepts PNG, JPEG, WebP, GIF and SVG. The entire multipart body is limited to 32 MiB. Returns media IDs usable with /api/user-medias/{id} and board image settings.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object" as const,
              required: ["files"],
              properties: {
                files: {
                  type: "array" as const,
                  minItems: 1,
                  maxItems: 32,
                  items: { type: "string" as const, format: "binary" },
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Uploaded media IDs",
          content: { "application/json": { schema: { type: "array" as const, items: { type: "string" as const } } } },
        },
        "400": { description: "Invalid multipart data, file count, size or format" },
        "401": { description: "API key required" },
        "403": { description: "Requires media-upload permission" },
        "413": { description: "Multipart body exceeds 32 MiB" },
        "415": { description: "Expected multipart/form-data" },
        "500": { description: "Media upload failed" },
      },
    },
  },
};
