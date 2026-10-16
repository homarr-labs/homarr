"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const RESOURCE_ORIGIN = "https://worker.homarr.invalid";
const MAX_MEDIA_BYTES = 32 * 1024 * 1024;
const MAX_RETAINED_BYTES = 64 * 1024 * 1024;
export type ResourceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const nativeFetch: ResourceFetch = (input, init) => globalThis.fetch(input, init);

/** Worker data stays in its connection scope, including streaming responses and temporary media. */
export function createWorkerResourceScope(transportFetch: ResourceFetch) {
  let disposed = false;
  let retainedBytes = 0;
  let references = 0;
  let activeMedia = 0;
  const mediaQueue = new Set<{ run(): void; abort(): void }>();
  const requests = new Set<AbortController>();
  const urls = new Map<string, number>();

  const acquireMedia = (signal: AbortSignal) =>
    new Promise<() => void>((resolve, reject) => {
      if (disposed || signal.aborted) {
        reject(new DOMException("Worker connection changed", "AbortError"));
        return;
      }
      if (mediaQueue.size >= 128) {
        reject(new Error("Too many worker media previews"));
        return;
      }
      const waiter = {
        run() {
          mediaQueue.delete(waiter);
          signal.removeEventListener("abort", waiter.abort);
          activeMedia += 1;
          resolve(() => {
            activeMedia -= 1;
            mediaQueue.values().next().value?.run();
          });
        },
        abort() {
          mediaQueue.delete(waiter);
          signal.removeEventListener("abort", waiter.abort);
          reject(new DOMException("Worker connection changed", "AbortError"));
        },
      };
      signal.addEventListener("abort", waiter.abort, { once: true });
      if (activeMedia < 4) waiter.run();
      else mediaQueue.add(waiter);
    });
  const resourceFetch: ResourceFetch = async (input, init) => {
    if (disposed) throw new DOMException("Worker connection changed", "AbortError");
    let requestInput = input;
    if (typeof input === "string" && input.startsWith("/")) requestInput = new URL(input, RESOURCE_ORIGIN);
    let requestUrl: string;
    if (requestInput instanceof Request) requestUrl = requestInput.url;
    else requestUrl = String(requestInput);
    const target = new URL(requestUrl);
    if (target.origin !== RESOURCE_ORIGIN) {
      if (typeof window === "undefined" || target.origin !== window.location.origin) {
        throw new Error("Only worker resource paths can use the worker connection");
      }
    }
    const controller = new AbortController();
    let requestSignal = init?.signal;
    if (!requestSignal && requestInput instanceof Request) requestSignal = requestInput.signal;
    const abort = () => controller.abort(requestSignal?.reason);
    requestSignal?.addEventListener("abort", abort, { once: true });
    if (requestSignal?.aborted) abort();
    requests.add(controller);
    const release = () => {
      requests.delete(controller);
      requestSignal?.removeEventListener("abort", abort);
    };
    try {
      if (controller.signal.aborted) throw new DOMException("Worker connection changed", "AbortError");
      // Keep the original BodyInit. Firefox does not expose Request.body, and the
      // encrypted transport already encodes FormData/Blob/opaque Requests safely.
      const response = await transportFetch(requestInput, { ...init, signal: controller.signal });
      if (disposed || controller.signal.aborted) {
        await response.body?.cancel();
        throw new DOMException("Worker connection changed", "AbortError");
      }
      if (!response.body) {
        release();
        return response;
      }
      const reader = response.body.getReader();
      let responseController: ReadableStreamDefaultController<Uint8Array> | undefined;
      const cancel = () => {
        try {
          responseController?.error(new DOMException("Worker connection changed", "AbortError"));
        } catch {
          /* Already settled. */
        }
        void reader.cancel(controller.signal.reason).catch(() => {});
        release();
      };
      controller.signal.addEventListener("abort", cancel, { once: true });
      const finish = () => {
        controller.signal.removeEventListener("abort", cancel);
        release();
      };
      return new Response(
        new ReadableStream<Uint8Array>({
          start(stream) {
            responseController = stream;
          },
          async pull(stream) {
            try {
              if (controller.signal.aborted) throw new DOMException("Worker connection changed", "AbortError");
              const result = await reader.read();
              if (controller.signal.aborted) throw new DOMException("Worker connection changed", "AbortError");
              if (result.done) {
                finish();
                stream.close();
              } else stream.enqueue(result.value);
            } catch (error) {
              finish();
              stream.error(error);
            }
          },
          async cancel(reason) {
            controller.abort(reason);
            finish();
            await reader.cancel(reason);
          },
        }),
        { status: response.status, statusText: response.statusText, headers: response.headers },
      );
    } catch (error) {
      release();
      throw error;
    }
  };

  return {
    fetch: resourceFetch,
    async createMediaUrl(path: string, signal: AbortSignal, kind: "image" | "video" = "image") {
      const releaseMedia = await acquireMedia(signal);
      try {
        const response = await resourceFetch(path, { signal });
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`Worker media returned ${response.status}`);
        }
        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
        if (!contentType.startsWith(`${kind}/`)) {
          await response.body?.cancel();
          throw new Error("Worker returned an unsupported media type");
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Worker media is empty");
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let bytes = 0;
        try {
          const declaredBytes = Number(response.headers.get("content-length"));
          if (declaredBytes > MAX_MEDIA_BYTES) throw new Error("Worker media exceeds the preview limit");
          while (true) {
            const result = await reader.read();
            if (signal.aborted || disposed) throw new DOMException("Worker connection changed", "AbortError");
            if (result.done) break;
            bytes += result.value.byteLength;
            if (bytes > MAX_MEDIA_BYTES || retainedBytes + result.value.byteLength > MAX_RETAINED_BYTES) {
              throw new Error("Worker media exceeds the preview limit");
            }
            retainedBytes += result.value.byteLength;
            chunks.push(new Uint8Array(result.value));
          }
        } catch (error) {
          retainedBytes = Math.max(0, retainedBytes - chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
          await reader.cancel(error);
          throw error;
        }
        const url = URL.createObjectURL(new Blob(chunks, { type: contentType }));
        urls.set(url, bytes);
        return url;
      } finally {
        releaseMedia();
      }
    },
    revokeMediaUrl(url: string) {
      const bytes = urls.get(url);
      if (bytes === undefined) return;
      urls.delete(url);
      retainedBytes -= bytes;
      URL.revokeObjectURL(url);
    },
    dispose() {
      disposed = true;
      for (const waiter of mediaQueue) waiter.abort();
      for (const controller of requests) controller.abort(new DOMException("Worker connection changed", "AbortError"));
      requests.clear();
      for (const url of urls.keys()) URL.revokeObjectURL(url);
      urls.clear();
      retainedBytes = 0;
    },
    retain() {
      references += 1;
      return () => {
        references -= 1;
        queueMicrotask(() => {
          if (references === 0) this.dispose();
        });
      };
    },
  };
}

type ResourceScope = ReturnType<typeof createWorkerResourceScope>;
interface ResourceContextValue {
  workerId: string | null;
  scope: ResourceScope | null;
}
const ResourceContext = createContext<ResourceContextValue>({ workerId: null, scope: null });

export function ResourceFetchProvider({
  workerId,
  scope: scopeKey,
  fetch: transportFetch,
  children,
}: {
  workerId: string | null;
  scope?: string;
  fetch: ResourceFetch;
  children: ReactNode;
}) {
  const resourceScope = useMemo(() => {
    if (!workerId) return null;
    return createWorkerResourceScope(transportFetch);
    // A grant or channel change must retire media even when the worker ID is unchanged.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, scopeKey, transportFetch]);
  useEffect(() => resourceScope?.retain(), [resourceScope]);
  const value = useMemo(() => ({ workerId, scope: resourceScope }), [workerId, resourceScope]);
  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
}

export function useResourceFetch(): ResourceFetch {
  return useContext(ResourceContext).scope?.fetch ?? nativeFetch;
}
export function useResourceWorkerId() {
  return useContext(ResourceContext).workerId;
}

export function getWorkerResourcePath(source: string): string | null {
  let path = source;
  if (!path.startsWith("/") || path.startsWith("//")) {
    if (typeof window === "undefined") return null;
    try {
      const url = new URL(source, window.location.href);
      if (url.origin !== window.location.origin && url.origin !== RESOURCE_ORIGIN) return null;
      path = url.pathname + url.search;
    } catch {
      return null;
    }
  }
  if (/^\/remote\/boards\/[^/]+\/media\/[^/?]+(?:\?|$)/.test(path)) return path;
  if (!/^\/api\/(?:image-proxy|user-medias|assistant\/file|federation\/media)\//.test(path)) return null;
  return path;
}

/** A failed or pending worker image never falls back to the hosted site's HTTP route. */
export function useWorkerResource(
  source: string | undefined,
  options: { kind?: "image" | "video"; retry?: number } = {},
) {
  const { scope } = useContext(ResourceContext);
  let path: string | null = null;
  if (source && scope) path = getWorkerResourcePath(source);
  const [loaded, setLoaded] = useState<{
    scope: ResourceScope;
    path: string;
    retry: number;
    url?: string;
    error?: Error;
  }>();
  const kind = options.kind ?? "image";
  const retry = options.retry ?? 0;
  useEffect(() => {
    if (!scope || !path) return;
    const controller = new AbortController();
    let url: string | undefined;
    void scope
      .createMediaUrl(path, controller.signal, kind)
      .then((result) => {
        url = result;
        if (controller.signal.aborted) {
          scope.revokeMediaUrl(result);
          return;
        }
        setLoaded({ scope, path, retry, url: result });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoaded({
            scope,
            path,
            retry,
            error: error instanceof Error ? error : new Error("Worker media could not be loaded"),
          });
      });
    return () => {
      controller.abort();
      if (url) scope.revokeMediaUrl(url);
    };
  }, [scope, path, kind, retry]);
  if (!scope || !path) return { url: source, error: undefined, loading: false };
  if (loaded?.scope === scope && loaded.path === path && loaded.retry === retry)
    return { url: loaded.url, error: loaded.error, loading: false };
  return { url: undefined, error: undefined, loading: true };
}

export function useWorkerResourceUrl(
  source: string | undefined,
  options: { kind?: "image" | "video"; retry?: number } = {},
) {
  return useWorkerResource(source, options).url;
}
