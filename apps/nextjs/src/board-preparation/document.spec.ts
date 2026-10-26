// @vitest-environment node
import { gzipSync } from "node:zlib";
import { describe, expect, test } from "vitest";

import { compressDocumentAsync, decompressDocumentAsync, maxDocumentBytes, revealCapturedDocument } from "./document";

describe("prepared Board storage", () => {
  test("round-trips streamed HTML and Unicode without retaining raw HTML in storage", async () => {
    const html = '<html><script>self.__next_f.push(["cached 🌍 données"])</script></html>'.repeat(1_000);
    const document = await compressDocumentAsync(html);
    expect(document.body.length).toBeLessThan(Buffer.byteLength(html) / 4);
    expect(await decompressDocumentAsync(document)).toBe(html);
  });

  test("rejects documents over the byte budget before compression", async () => {
    await expect(compressDocumentAsync("🌍".repeat(maxDocumentBytes / 4 + 1))).rejects.toThrow("size budget");
  });

  test("bounds decompression even when a small stored value expands beyond the budget", async () => {
    const body = gzipSync("x".repeat(maxDocumentBytes + 1)).toString("base64");
    await expect(decompressDocumentAsync({ encoding: "gzip-base64", body })).rejects.toThrow();
  });

  test("rejects corrupt data so the caller can use ordinary SSR", async () => {
    await expect(decompressDocumentAsync({ encoding: "gzip-base64", body: "corrupt" })).rejects.toThrow();
  });
});

test("removes React reveal delays without changing widget text or serialized values", () => {
  const content = '<p>$RT=performance.now()</p><script>self.__next_f.push(["$RT=performance.now()"])</script>';
  const bootstrap = '<script nonce="test">requestAnimationFrame(function(){$RT=performance.now()});</script>';
  const reveal = "<script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){}}</script>";
  expect(revealCapturedDocument(content + bootstrap + reveal)).toBe(
    content + '<script nonce="test"></script><script>$RB=[];$RV=function(a){for(var b=0;b<a.length;b+=2){}}</script>',
  );
});
