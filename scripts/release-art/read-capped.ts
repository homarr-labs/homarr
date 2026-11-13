export const readCapped = async (res: Response, maxBytes: number) => {
  if (Number(res.headers.get("content-length")) > maxBytes) throw new Error("response too large");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("response too large");
    }
    chunks.push(value);
  }
};
