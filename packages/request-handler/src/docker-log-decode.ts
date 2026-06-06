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
  let buffer = Buffer.alloc(0);

  const processChunk = (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length > 0) {
      if (buffer.length < DOCKER_STREAM_HEADER_SIZE) {
        break;
      }

      const streamType = buffer.readUInt8(0);
      if (!DOCKER_STREAM_TYPES.has(streamType)) {
        onData(buffer.toString("utf-8"));
        buffer = Buffer.alloc(0);
        break;
      }

      const length = buffer.readUInt32BE(4);
      if (length > maxMessageSize) {
        onError(
          new Error(`Docker log message size (${length} bytes) exceeds maximum allowed (${maxMessageSize} bytes)`),
        );
        return false;
      }

      const fullMessageSize = DOCKER_STREAM_HEADER_SIZE + length;
      if (buffer.length < fullMessageSize) {
        break;
      }

      const payload = buffer.subarray(DOCKER_STREAM_HEADER_SIZE, fullMessageSize);
      onData(payload.toString("utf-8"));
      buffer = buffer.subarray(fullMessageSize);
    }

    return true;
  };

  return processChunk;
};
