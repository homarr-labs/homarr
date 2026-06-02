import { describe, expect, test } from "vitest";

import { createDockerLogStreamProcessor, decodeDockerLogs } from "./docker-log-decode";

const encodeDockerLogFrame = (streamType: number, message: string) => {
  const payload = Buffer.from(message, "utf-8");
  const header = Buffer.alloc(8);
  header.writeUInt8(streamType, 0);
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
};

describe("decodeDockerLogs", () => {
  test("decodes multiplexed docker log frames", () => {
    const logs = Buffer.concat([encodeDockerLogFrame(1, "hello "), encodeDockerLogFrame(2, "world")]);

    expect(decodeDockerLogs(logs)).toBe("hello world");
  });

  test("returns plain text logs unchanged", () => {
    expect(decodeDockerLogs("plain text log")).toBe("plain text log");
  });

  test("falls back to raw buffer text for non-multiplexed output", () => {
    expect(decodeDockerLogs(Buffer.from("raw docker output", "utf-8"))).toBe("raw docker output");
  });
});

describe("createDockerLogStreamProcessor", () => {
  test("emits decoded chunks from a stream", () => {
    const messages: string[] = [];
    const processChunk = createDockerLogStreamProcessor(
      (data) => messages.push(data),
      () => undefined,
      1024,
    );

    const chunk = encodeDockerLogFrame(1, "streamed log");
    expect(processChunk(chunk)).toBe(true);
    expect(messages).toEqual(["streamed log"]);
  });

  test("returns false when message size exceeds limit", () => {
    const processChunk = createDockerLogStreamProcessor(
      () => undefined,
      () => undefined,
      4,
    );

    const chunk = encodeDockerLogFrame(1, "this message is too long");
    expect(processChunk(chunk)).toBe(false);
  });
});
