import { z } from "zod/v4";
import { MAX_CUSTOM_WIDGET_AUTH_HEADERS } from "@homarr/custom-widgets/core";

export const MAX_CONFIGURATION_REQUEST_BODY_BYTES = 24 * 1024;

export function getHeaderConfigurationRequestBodyLimit(requestedHeaderCount: number) {
  if (
    !Number.isInteger(requestedHeaderCount) ||
    requestedHeaderCount < 1 ||
    requestedHeaderCount > MAX_CUSTOM_WIDGET_AUTH_HEADERS
  ) {
    return null;
  }
  // JSON can escape each credential code unit to six bytes. Reserve bounded connection metadata and keys.
  return requestedHeaderCount * 8192 * 6 + 16 * 1024;
}
const configurationRequestBodySchema = z
  .strictObject({
    baseUrl: z.string().optional(),
    integrationId: z.string().min(1).max(100).optional(),
    networkScope: z.unknown().optional(),
    secrets: z.record(z.string(), z.string()),
  })
  .refine(
    (value) => Boolean(value.integrationId) || value.baseUrl !== undefined,
    "Provide an integration or HTTP connection",
  );

export async function readConfigurationRequestBody(
  request: Request,
  maximumBytes = MAX_CONFIGURATION_REQUEST_BODY_BYTES,
): Promise<
  { status: "ok"; data: z.infer<typeof configurationRequestBodySchema> } | { status: "invalid" | "too-large" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maximumBytes) {
    return { status: "too-large" };
  }
  if (!request.body) return { status: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel();
        return { status: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { status: "invalid" };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const candidate = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    const result = configurationRequestBodySchema.safeParse(candidate);
    return result.success ? { status: "ok", data: result.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}
