import { describe, expect, test } from "bun:test";

import { createWorkerResourceScope, getWorkerResourcePath } from "./resources";

describe("worker resource transport", () => {
  test("sends multipart uploads through the selected worker and rejects external destinations", async () => {
    let received: Request | undefined;
    let receivedBody: BodyInit | null | undefined;
    const scope = createWorkerResourceScope(async (input, init) => {
      receivedBody = init?.body;
      received = new Request(input, init);
      return Response.json({ uploaded: true });
    });
    const form = new FormData();
    form.set("file", new File(["private backup"], "backup.zip"));
    const response = await scope.fetch("/api/backup/import", { method: "POST", body: form });
    expect(await response.json()).toEqual({ uploaded: true });
    expect(received?.url).toBe("https://worker.homarr.invalid/api/backup/import");
    expect(received?.method).toBe("POST");
    expect(receivedBody).toBe(form);
    if (!received) throw new Error("The worker did not receive the upload");
    const file = (await received.formData()).get("file") as File;
    expect(await file.text()).toBe("private backup");
    await expect(scope.fetch("https://external.test/private")).rejects.toThrow("Only worker resource paths");
    scope.dispose();
  });

  test("switching workers aborts outstanding streams and prevents subsequent use of the old connection", async () => {
    let cancelled = false;
    let requestSignal: AbortSignal | undefined;
    const scope = createWorkerResourceScope(async (input, init) => {
      requestSignal = new Request(input, init).signal;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("private event"));
          },
          cancel() {
            cancelled = true;
          },
        }),
      );
    });
    const response = await scope.fetch("/api/assistant/chat", { method: "POST" });
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The worker did not return a stream");
    await Promise.resolve();
    scope.dispose();
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(requestSignal?.aborted).toBe(true);
    expect(cancelled).toBe(true);
    await expect(reader.read()).rejects.toThrow("Worker connection changed");
    await expect(scope.fetch("/api/backup/export")).rejects.toThrow("Worker connection changed");
  });

  test("media URLs are scoped, revoked, and bounded before untrusted bodies are accumulated", async () => {
    const scope = createWorkerResourceScope(async (input) => {
      if (new Request(input).url.endsWith("large")) {
        return new Response("small body", { headers: { "content-type": "image/png", "content-length": "33554433" } });
      }
      if (new Request(input).url.endsWith("html"))
        return new Response("<script>secret</script>", { headers: { "content-type": "text/html" } });
      return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });
    });
    const signal = new AbortController().signal;
    const url = await scope.createMediaUrl("/api/user-medias/image", signal);
    expect((await fetch(url)).headers.get("content-type")).toBe("image/png");
    await expect(scope.createMediaUrl("/api/user-medias/large", signal)).rejects.toThrow("preview limit");
    await expect(scope.createMediaUrl("/api/user-medias/html", signal)).rejects.toThrow("unsupported media type");
    scope.dispose();
    await expect(fetch(url)).rejects.toThrow();
    expect(getWorkerResourcePath("/api/image-proxy/opaque?size=small")).toBe("/api/image-proxy/opaque?size=small");
    expect(getWorkerResourcePath("/remote/boards/board-one/media/signed-token")).toBe(
      "/remote/boards/board-one/media/signed-token",
    );
    expect(getWorkerResourcePath("//external.test/api/user-medias/secret")).toBeNull();
    expect(getWorkerResourcePath("/logo/logo.png")).toBeNull();
  });

  test("switching workers cancels queued previews without opening requests on the next worker", async () => {
    let opened = 0;
    const scope = createWorkerResourceScope(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          opened += 1;
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    );
    const signal = new AbortController().signal;
    const previews = Array.from({ length: 8 }, (_, index) => scope.createMediaUrl(`/api/user-medias/${index}`, signal));
    await Promise.resolve();
    await Promise.resolve();
    expect(opened).toBe(4);
    scope.dispose();
    const results = await Promise.allSettled(previews);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(opened).toBe(4);
  });
});
