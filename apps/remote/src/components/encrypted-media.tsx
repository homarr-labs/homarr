import { Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { WorkerConnection } from "../lib/connection";

interface WidgetMediaSource {
  id: string;
  data?: unknown;
}
interface MediaResult {
  url?: string;
  failed?: boolean;
}
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export function isEncryptedMediaPath(value: unknown, boardId: string): value is string {
  return (
    typeof value === "string" &&
    value.length < 8192 &&
    value.startsWith(`/remote/boards/${encodeURIComponent(boardId)}/media/`) &&
    !/[?#\r\n]/.test(value)
  );
}

function mediaReferences(widgets: WidgetMediaSource[], boardId: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const allPaths = new Set<string>();
  let inspected = 0;
  for (const widget of widgets) {
    const paths = new Set<string>();
    const pending = [{ value: widget.data, depth: 0 }];
    while (pending.length && inspected < 2000) {
      const entry = pending.pop();
      if (!entry) break;
      inspected += 1;
      if (isEncryptedMediaPath(entry.value, boardId)) {
        if (allPaths.has(entry.value) || allPaths.size < 20) {
          allPaths.add(entry.value);
          paths.add(entry.value);
        }
      } else if (entry.value && typeof entry.value === "object" && entry.depth < 10) {
        for (const value of Object.values(entry.value).slice(0, 100)) pending.push({ value, depth: entry.depth + 1 });
      }
    }
    result.set(widget.id, [...paths]);
  }
  return result;
}

async function imageBlob(response: Response): Promise<Blob> {
  const type = response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  if (!response.ok || !type || !allowedImageTypes.has(type) || !response.body) throw new Error("Image unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 8 * 1024 * 1024) throw new Error("Image too large");
      chunks.push(new Uint8Array(next.value));
    }
    return new Blob(chunks, { type });
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export function useEncryptedMedia(connection: WorkerConnection, widgets: WidgetMediaSource[], boardId: string) {
  const references = useMemo(() => mediaReferences(widgets, boardId), [widgets, boardId]);
  const [media, setMedia] = useState<Record<string, MediaResult>>({});
  useEffect(() => {
    const abort = new AbortController();
    const objectUrls: string[] = [];
    const paths = [...new Set([...references.values()].flat())];
    let next = 0;
    setMedia({});
    async function load() {
      while (!abort.signal.aborted && next < paths.length) {
        const path = paths[next++];
        if (!path) continue;
        try {
          const response = await connection.fetch(path, { signal: abort.signal });
          const blob = await imageBlob(response);
          if (abort.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          setMedia((current) => ({ ...current, [path]: { url } }));
        } catch {
          if (!abort.signal.aborted) setMedia((current) => ({ ...current, [path]: { failed: true } }));
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, paths.length) }, () => load()));
    return () => {
      abort.abort();
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [connection, references]);
  return { references, media };
}

export function EncryptedMedia({
  paths,
  media,
  title,
}: {
  paths: string[];
  media: Record<string, MediaResult>;
  title: string;
}) {
  if (!paths.length) return null;
  return (
    <div className="widget-media">
      {paths.map((path, index) => {
        const image = media[path];
        if (image?.url)
          return <img key={path} src={image.url} alt={`${title}, ${index + 1}`} loading="lazy" decoding="async" />;
        if (image?.failed)
          return (
            <Text key={path} size="xs" c="dimmed">
              Image unavailable
            </Text>
          );
        return (
          <Text key={path} size="xs" c="dimmed">
            Loading image…
          </Text>
        );
      })}
    </div>
  );
}
