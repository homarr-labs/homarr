import type { RenderArtifact } from "../../contracts/schemas";
import type { FixtureConfig } from "../context/config";

type RenderPolicy = FixtureConfig["render"];
type CacheEntry = { artifact: RenderArtifact; bytes: number; expiresAt: number };
export type RenderResult = { artifact: RenderArtifact; disposition: "hit" | "miss" | "joined" | "bypass" };

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RenderArtifact>>();
let bytes = 0;
let renders = 0;
let closed = false;

function remove(key: string): void {
  const entry = entries.get(key);
  if (!entry) return;
  bytes -= entry.bytes;
  entries.delete(key);
}

function prune(now: number): void {
  for (const [key, entry] of entries) if (entry.expiresAt <= now) remove(key);
}

export function renderEvidence() {
  prune(Date.now());
  return { entries: entries.size, bytes, inFlight: inFlight.size, renders };
}

export async function getRenderArtifact(
  key: string,
  policy: RenderPolicy,
  render: () => Promise<RenderArtifact>,
): Promise<RenderResult | null> {
  if (closed) return null;
  prune(Date.now());
  const existing = entries.get(key);
  if (existing) {
    entries.delete(key);
    entries.set(key, existing);
    return { artifact: existing.artifact, disposition: "hit" };
  }
  const pending = inFlight.get(key);
  if (pending) return { artifact: await pending, disposition: "joined" };
  if (inFlight.size >= Math.min(policy.maxInFlight, 4)) return null;
  renders = Math.min(Number.MAX_SAFE_INTEGER, renders + 1);
  const work = Promise.resolve().then(render);
  inFlight.set(key, work);
  try {
    const artifact = await work;
    const size =
      new TextEncoder().encode(JSON.stringify(artifact)).byteLength + new TextEncoder().encode(key).byteLength;
    if (closed || size > Math.min(policy.maxArtifactBytes, 1048576) || size > Math.min(policy.maxBytes, 8388608)) {
      return { artifact, disposition: "bypass" };
    }
    while (entries.size >= Math.min(policy.maxEntries, 32) || bytes + size > Math.min(policy.maxBytes, 8388608)) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) return { artifact, disposition: "bypass" };
      remove(oldest);
    }
    entries.set(key, { artifact, bytes: size, expiresAt: Date.now() + Math.min(policy.maxAgeMs, 30000) });
    bytes += size;
    return { artifact, disposition: "miss" };
  } finally {
    if (inFlight.get(key) === work) inFlight.delete(key);
  }
}

export async function closeArtifactCache(): Promise<void> {
  closed = true;
  entries.clear();
  bytes = 0;
  await Promise.allSettled(inFlight.values());
  inFlight.clear();
}
