interface ReadableResponse {
  headers: { get: (name: string) => string | null };
  body: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
      cancel: () => Promise<void>;
      releaseLock?: () => void;
    };
  } | null;
}

export async function readBoundedResponseAsync(
  response: ReadableResponse,
  maxBytes: number,
  label = "Response",
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = response.body?.getReader();
  let onAbort: (() => void) | undefined;
  try {
    signal?.throwIfAborted();
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error(`${label} exceeds ${maxBytes} bytes`);
    }
    if (!reader) return null;

    const aborted = signal
      ? new Promise<never>((_resolve, reject) => {
          onAbort = () => reject(signal.reason);
          signal.addEventListener("abort", onAbort, { once: true });
        })
      : undefined;
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    for (;;) {
      const { done, value } = await (aborted ? Promise.race([reader.read(), aborted]) : reader.read());
      if (done) break;
      if (!value) continue;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        throw new Error(`${label} exceeds ${maxBytes} bytes`);
      }
      chunks.push(value);
    }

    const body = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return body;
  } catch (error) {
    void reader?.cancel().catch(() => undefined);
    throw error;
  } finally {
    if (onAbort) signal?.removeEventListener("abort", onAbort);
    reader?.releaseLock?.();
  }
}

export async function readBoundedJsonResponseAsync(
  response: ReadableResponse,
  maxBytes: number,
  label = "Response",
): Promise<unknown> {
  const body = await readBoundedResponseAsync(response, maxBytes, label);
  if (body === null) return null;
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}
