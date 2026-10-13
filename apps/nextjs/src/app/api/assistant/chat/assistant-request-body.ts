export const readAssistantRequestBodyAsync = async (request: Request, maxBytes: number): Promise<string | null> => {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let byteLength = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        // A canceled transport can reject cancellation; the size limit still takes precedence.
        await reader.cancel().catch(() => undefined);
        return null;
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    reader.releaseLock();
  }
};
