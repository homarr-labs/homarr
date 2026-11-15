// @vitest-environment node

import { describe, expect, test } from "vitest";

import { readCameraFramesAsync } from "./camera-stream";

describe("live camera responses", () => {
  test("delivers a JPEG split across chunks and reports a normally ended feed", async () => {
    const jpeg = new Uint8Array([255, 216, 1, 2, 255, 217]);
    const header = new TextEncoder().encode("--camera\r\nContent-Type: image/jpeg\r\nContent-Length: 6\r\n\r\n");
    const end = new TextEncoder().encode("\r\n--camera--\r\n");
    const chunks = [header.slice(0, 12), header.slice(12), jpeg.slice(0, 3), jpeg.slice(3), end];
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      }),
      { headers: { "Content-Type": "multipart/x-mixed-replace; boundary=camera" } },
    );
    const frames: Blob[] = [];

    await expect(readCameraFramesAsync(response, (frame) => frames.push(frame))).rejects.toThrow("ended");
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    if (!frame) throw new Error("The camera did not deliver a frame");
    expect(new Uint8Array(await frame.arrayBuffer())).toEqual(jpeg);
  });

  test("reads camera frames without Content-Length across split boundaries", async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode("--camera\r\nContent-Type: image/jpeg\r\n\r\n"),
      255,
      216,
      3,
      4,
      255,
      217,
      ...new TextEncoder().encode("\r\n--camera--\r\n"),
    ]);
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
          controller.close();
        },
      }),
      { headers: { "Content-Type": 'multipart/x-mixed-replace; boundary="camera"' } },
    );
    const frames: Blob[] = [];

    await expect(readCameraFramesAsync(response, (frame) => frames.push(frame))).rejects.toThrow("ended");
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    if (!frame) throw new Error("The camera did not deliver a frame");
    expect(new Uint8Array(await frame.arrayBuffer())).toEqual(new Uint8Array([255, 216, 3, 4, 255, 217]));
  });
});
