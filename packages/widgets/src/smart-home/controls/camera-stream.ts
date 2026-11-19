// ponytail: Native MJPEG <img> does not report EOF/stalls in Chromium. Keep this
// bounded JPEG reader until native playback exposes reliable stream-health events.
const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_HEADER_BYTES = 16 * 1024;
const MAX_BUFFER_BYTES = MAX_FRAME_BYTES + MAX_HEADER_BYTES + 512;
const headerEnd = new Uint8Array([13, 10, 13, 10]);

const findBytes = (bytes: Uint8Array, target: Uint8Array) => {
  for (let start = 0; start <= bytes.length - target.length; start++) {
    let matches = true;
    for (let offset = 0; offset < target.length; offset++) {
      if (bytes[start + offset] === target[offset]) continue;
      matches = false;
      break;
    }
    if (matches) return start;
  }
  return -1;
};

export async function readCameraFramesAsync(response: Response, onFrame: (frame: Blob) => void): Promise<void> {
  const contentType = response.headers.get("content-type") ?? "";
  const match = /boundary=(?:"([^"\r\n]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = match?.[1] ?? match?.[2];
  if (
    !response.ok ||
    !response.body ||
    !/^multipart\/x-mixed-replace\s*;/i.test(contentType) ||
    !boundary ||
    boundary.length > 70
  ) {
    await response.body?.cancel();
    throw new Error("The camera did not return an image stream");
  }
  const encoder = new TextEncoder();
  let delimiter = encoder.encode(`--${boundary}`);
  let frameEnd = encoder.encode(`\r\n--${boundary}`);
  let advertisedDelimiter: Uint8Array<ArrayBuffer> | null = null;
  // Home Assistant's still-image stream includes the leading hyphens in its header.
  if (boundary.startsWith("--")) advertisedDelimiter = encoder.encode(boundary);
  const reader = response.body.getReader();
  let storage = new Uint8Array(64 * 1024);
  let buffer = storage.subarray(0, 0);
  let state: "boundary" | "headers" | "frame" = "boundary";
  let frameLength: number | null = null;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("The camera stream ended");
      const bufferedLength = buffer.length + chunk.value.length;
      if (bufferedLength > MAX_BUFFER_BYTES) {
        throw new Error("The camera frame is too large");
      }
      let offset = buffer.byteOffset;
      if (offset + bufferedLength > storage.length) {
        if (bufferedLength > storage.length) {
          const grown = new Uint8Array(Math.min(MAX_BUFFER_BYTES, Math.max(bufferedLength, storage.length * 2)));
          grown.set(buffer);
          storage = grown;
        } else {
          storage.copyWithin(0, offset, offset + buffer.length);
        }
        offset = 0;
      }
      storage.set(chunk.value, offset + buffer.length);
      buffer = storage.subarray(offset, offset + bufferedLength);

      while (true) {
        if (state === "boundary") {
          let start = findBytes(buffer, delimiter);
          if (advertisedDelimiter) {
            const alternateStart = findBytes(buffer, advertisedDelimiter);
            if (alternateStart >= 0 && (start < 0 || alternateStart < start)) {
              delimiter = advertisedDelimiter;
              frameEnd = encoder.encode(`\r\n${boundary}`);
              start = alternateStart;
            }
            if (start >= 0) advertisedDelimiter = null;
          }
          if (start < 0 || buffer.length < start + delimiter.length + 2) {
            if (buffer.length > MAX_HEADER_BYTES) throw new Error("Invalid camera boundary");
            break;
          }
          const end = start + delimiter.length;
          if (start > MAX_HEADER_BYTES) throw new Error("Camera headers are too large");
          if (buffer[end] === 45 && buffer[end + 1] === 45) throw new Error("The camera stream ended");
          if (buffer[end] !== 13 || buffer[end + 1] !== 10) throw new Error("Invalid camera boundary");
          buffer = buffer.subarray(end + 2);
          state = "headers";
        }
        if (state === "headers") {
          const end = findBytes(buffer, headerEnd);
          if (end < 0) {
            if (buffer.length > MAX_HEADER_BYTES) throw new Error("Camera headers are too large");
            break;
          }
          const headers = new TextDecoder().decode(buffer.slice(0, end));
          if (end > MAX_HEADER_BYTES) throw new Error("Camera headers are too large");
          if (!/^content-type:\s*image\/jpeg\s*(?:;[^\r\n]*)?$/im.test(headers))
            throw new Error("Expected a JPEG camera frame");
          const length = /^content-length:\s*(\d+)\s*$/im.exec(headers)?.[1];
          frameLength = null;
          if (length !== undefined) frameLength = Number(length);
          if (/^content-length:/im.test(headers) && length === undefined)
            throw new Error("Invalid camera frame length");
          if (
            frameLength !== null &&
            (!Number.isSafeInteger(frameLength) || frameLength <= 0 || frameLength > MAX_FRAME_BYTES)
          ) {
            throw new Error("Invalid camera frame length");
          }
          buffer = buffer.subarray(end + headerEnd.length);
          state = "frame";
        }
        let length = frameLength;
        if (length === null) {
          const end = findBytes(buffer, frameEnd);
          if (end < 0) {
            if (buffer.length > MAX_FRAME_BYTES) throw new Error("The camera frame is too large");
            break;
          }
          length = end;
        }
        if (length <= 0 || length > MAX_FRAME_BYTES) throw new Error("Invalid camera frame length");
        if (buffer.length < length) break;
        onFrame(new Blob([buffer.slice(0, length)], { type: "image/jpeg" }));
        buffer = buffer.subarray(length);
        state = "boundary";
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
