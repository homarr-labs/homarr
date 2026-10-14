export class WidgetSourceError extends Error {
  constructor(readonly code: "source-error" | "timeout" | "invalid-response" | "saturated") {
    super(code);
  }
}

export async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  headers: Headers,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  const length = headers.get("content-length");
  if (
    !body ||
    headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json" ||
    (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes))
  ) {
    if (body && !body.locked) void body.cancel().catch(() => undefined);
    throw new WidgetSourceError("invalid-response");
  }
  const reader = body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const bytes = new Uint8Array(maxBytes);
  let size = 0;
  let complete = false;
  try {
    signal.throwIfAborted();
    for (;;) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      if (chunk.value.byteLength > maxBytes - size) throw new WidgetSourceError("invalid-response");
      bytes.set(chunk.value, size);
      size += chunk.value.byteLength;
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
    complete = true;
    return value;
  } catch (error) {
    if (signal.aborted) throw new WidgetSourceError("timeout");
    if (error instanceof WidgetSourceError) throw error;
    throw new WidgetSourceError("invalid-response");
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}
