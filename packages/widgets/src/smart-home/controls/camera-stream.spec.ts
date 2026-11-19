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

  test.each(["--frameboundary", "----frameboundary"])(
    "accepts a boundary starting with hyphens and the wire delimiter %s",
    async (delimiter) => {
      const bytes = new TextEncoder().encode(
        `${delimiter}\r\nContent-Type: image/jpeg\r\nContent-Length: 6\r\n\r\nframe!\r\n${delimiter}--\r\n`,
      );
      const response = new Response(
        new ReadableStream({
          start(controller) {
            for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "multipart/x-mixed-replace; boundary=--frameboundary" } },
      );
      const frames: Blob[] = [];

      await expect(readCameraFramesAsync(response, (frame) => frames.push(frame))).rejects.toThrow("ended");
      expect(frames).toHaveLength(1);
      expect(await frames[0]?.text()).toBe("frame!");
    },
  );

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

  test.each([true, false])(
    "keeps fragmented high-resolution frames intact (Content-Length: %s)",
    async (withLength) => {
      const response = new Response(
        new ReadableStream({
          start(controller) {
            for (const value of [65, 66]) {
              const image = new Uint8Array(2 * 1024 * 1024).fill(value);
              let header = "--camera\r\nContent-Type: image/jpeg\r\n";
              if (withLength) header += `Content-Length: ${image.length}\r\n`;
              controller.enqueue(new TextEncoder().encode(`${header}\r\n`));
              for (let offset = 0; offset < image.length; offset += 16 * 1024) {
                controller.enqueue(image.subarray(offset, offset + 16 * 1024));
              }
              controller.enqueue(new TextEncoder().encode("\r\n"));
            }
            controller.enqueue(new TextEncoder().encode("--camera--\r\n"));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "multipart/x-mixed-replace; boundary=camera" } },
      );
      const frames: Blob[] = [];

      await expect(readCameraFramesAsync(response, (frame) => frames.push(frame))).rejects.toThrow("ended");
      expect(frames).toHaveLength(2);
      for (const [index, frame] of frames.entries()) {
        expect(frame.size).toBe(2_097_152);
        expect(new Uint8Array(await frame.arrayBuffer()).every((byte) => byte === 65 + index)).toBe(true);
      }
    },
  );
});
