import { z } from "zod/v4";

export const MAX_CONFIGURATION_REQUEST_BODY_BYTES = 24 * 1024;
const configurationRequestBodySchema = z.strictObject({
  baseUrl: z.string(),
  networkScope: z.enum(["public", "private", "loopback"]),
  secrets: z.record(z.string(), z.string()),
});

export async function readConfigurationRequestBody(
  request: Request,
): Promise<
  { status: "ok"; data: z.infer<typeof configurationRequestBodySchema> } | { status: "invalid" | "too-large" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_CONFIGURATION_REQUEST_BODY_BYTES) {
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
      if (byteLength > MAX_CONFIGURATION_REQUEST_BODY_BYTES) {
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
