const DOCKER_STREAM_HEADER_SIZE = 8;
const DOCKER_STREAM_TYPES = new Set([1, 2]);

export const decodeDockerLogs = (logs: Buffer | string) => {
  if (typeof logs === "string") {
    return logs;
  }

  if (logs.length === 0) {
    return "";
  }

  let cursor = 0;
  const parts: string[] = [];

  while (cursor < logs.length) {
    if (cursor + DOCKER_STREAM_HEADER_SIZE > logs.length) {
      break;
    }

    const streamType = logs.readUInt8(cursor);
    if (!DOCKER_STREAM_TYPES.has(streamType)) {
      return logs.toString("utf-8");
    }

    const length = logs.readUInt32BE(cursor + 4);
    const start = cursor + DOCKER_STREAM_HEADER_SIZE;
    const end = start + length;
    if (end > logs.length) {
      break;
    }

    parts.push(logs.subarray(start, end).toString("utf-8"));
    cursor = end;
  }

  const decoded = parts.join("");
  if (decoded.length === 0) {
    return logs.toString("utf-8");
  }

  return decoded;
};

export const createDockerLogStreamProcessor = (
  onData: (data: string) => void,
  onError: (err: Error) => void,
  maxMessageSize: number,
) => {
  let buffer: Buffer = Buffer.alloc(0);
  let bufferSize = 0;
  let cursor = 0;

  const processChunk = (chunk: Buffer) => {
    if (bufferSize === 0) {
      buffer = chunk;
      bufferSize = chunk.length;
    } else {
      const pendingSize = bufferSize - cursor;
      const requiredSize = pendingSize + chunk.length;
      if (cursor > 0 || buffer.length < requiredSize) {
        // Grow partial frames geometrically so fragmented messages copy each byte
        // a bounded number of times. Complete frames use the input chunk directly.
        const capacity = Math.max(
          requiredSize,
          Math.min(maxMessageSize + DOCKER_STREAM_HEADER_SIZE, buffer.length * 2),
        );
        const expanded = Buffer.allocUnsafe(capacity);
        buffer.copy(expanded, 0, cursor, bufferSize);
        buffer = expanded;
      }
      chunk.copy(buffer, pendingSize);
      cursor = 0;
      bufferSize = requiredSize;
    }

    while (cursor < bufferSize) {
      if (bufferSize - cursor < DOCKER_STREAM_HEADER_SIZE) {
        break;
      }

      const streamType = buffer.readUInt8(cursor);
      if (!DOCKER_STREAM_TYPES.has(streamType)) {
        onData(buffer.toString("utf-8", cursor, bufferSize));
        cursor = bufferSize;
        break;
      }

      const length = buffer.readUInt32BE(cursor + 4);
      if (length > maxMessageSize) {
        onError(
          new Error(`Docker log message size (${length} bytes) exceeds maximum allowed (${maxMessageSize} bytes)`),
        );
        return false;
      }

      const start = cursor + DOCKER_STREAM_HEADER_SIZE;
      const end = start + length;
      if (bufferSize < end) {
        break;
      }

      onData(buffer.toString("utf-8", start, end));
      cursor = end;
    }

    if (cursor === bufferSize) {
      buffer = Buffer.alloc(0);
      bufferSize = 0;
      cursor = 0;
    }

    return true;
  };

  return processChunk;
};
