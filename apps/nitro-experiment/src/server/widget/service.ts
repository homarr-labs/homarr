import { ORPCError } from "@orpc/server";

import { sourceControlInputSchema, sourcePayloadSchema, widgetSnapshotSchema } from "../../contracts/schemas";
import type { BoardId, SourceControlInput, SourceControlOutput, WidgetSnapshot } from "../../contracts/schemas";
import { authorizeSourceControl } from "../access/guards";
import { readAuthorizedBoard } from "../api/board-read";
import type { FixtureConfig } from "../context/config";
import type { RequestContext } from "../context/request";
import { readBoundedJson, WidgetSourceError } from "./body";
import { closeSourceState, sourceVersion, updateSource } from "./source";

type WidgetFailure = Extract<WidgetSnapshot, { status: "unavailable" }>["error"];

interface WidgetEntry {
  snapshot: WidgetSnapshot;
  version: number;
  refreshAt: number;
  expiresAt: number;
  bytes: number;
}

interface WidgetFlight {
  controller: AbortController;
  promise: Promise<WidgetSnapshot>;
}

const entries = new Map<string, WidgetEntry>();
const flights = new Map<string, WidgetFlight>();
let retainedBytes = 0;
let generation = 0;
let closed = false;

function deleteEntry(key: string): void {
  const entry = entries.get(key);
  if (!entry) return;
  retainedBytes -= entry.bytes;
  entries.delete(key);
}

function pruneEntries(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) deleteEntry(key);
  }
}

function retainSnapshot(key: string, snapshot: WidgetSnapshot, version: number, limits: FixtureConfig["widget"]): void {
  if (closed) return;
  const now = Date.now();
  pruneEntries(now);
  deleteEntry(key);
  const refreshAt = snapshot.status === "ready" ? Date.parse(snapshot.freshUntil) : now + limits.freshMs;
  const expiresAt = snapshot.status === "unavailable" ? refreshAt : Date.parse(snapshot.staleUntil);
  const entry = { snapshot, version, refreshAt, expiresAt };
  const bytes = new TextEncoder().encode(key + JSON.stringify(entry)).byteLength + 32;
  if (bytes > limits.maxBytes || expiresAt <= now) return;
  while (entries.size >= limits.maxEntries || retainedBytes + bytes > limits.maxBytes) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    deleteEntry(oldest.value);
  }
  entries.set(key, { ...entry, bytes });
  retainedBytes += bytes;
}

function failedSnapshot(key: string, error: WidgetFailure): WidgetSnapshot {
  const lastGood = entries.get(key)?.snapshot;
  if (lastGood && lastGood.status !== "unavailable" && Date.parse(lastGood.staleUntil) > Date.now()) {
    return { ...lastGood, status: "stale", error };
  }
  return { status: "unavailable", generation, observedAt: null, data: null, error };
}

async function refreshSnapshot(
  key: string,
  origin: string,
  limits: FixtureConfig["widget"],
  version: number,
  controller: AbortController,
): Promise<WidgetSnapshot> {
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, limits.timeoutMs);
  let response: Response | undefined;
  let snapshot: WidgetSnapshot;
  try {
    const url = origin + "/fixture/source";
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.url !== url || response.redirected) throw new WidgetSourceError("invalid-response");
    if (!response.ok) {
      throw new WidgetSourceError(
        response.status === 504
          ? "timeout"
          : response.headers.get("X-Fixture-Source-Error") === "saturated"
            ? "saturated"
            : "source-error",
      );
    }
    const payload = sourcePayloadSchema.safeParse(
      await readBoundedJson(response.body, response.headers, limits.maxResponseBytes, controller.signal),
    );
    if (!payload.success) throw new WidgetSourceError("invalid-response");
    controller.signal.throwIfAborted();
    if (closed || version !== sourceVersion() || generation === Number.MAX_SAFE_INTEGER) {
      throw new WidgetSourceError("saturated");
    }
    const now = Date.now();
    generation += 1;
    snapshot = {
      status: "ready",
      data: payload.data.data,
      generation,
      observedAt: new Date(now).toISOString(),
      freshUntil: new Date(now + limits.freshMs).toISOString(),
      staleUntil: new Date(now + limits.staleMs).toISOString(),
    };
  } catch (error) {
    snapshot = failedSnapshot(
      key,
      timedOut ? "timeout" : error instanceof WidgetSourceError ? error.code : "source-error",
    );
  } finally {
    clearTimeout(timer);
    if (response?.body && !response.body.locked) void response.body.cancel().catch(() => undefined);
  }
  if (version === sourceVersion()) retainSnapshot(key, snapshot, version, limits);
  return snapshot;
}

function currentSnapshot(origin: string, boardId: BoardId, limits: FixtureConfig["widget"]): Promise<WidgetSnapshot> {
  const now = Date.now();
  pruneEntries(now);
  const key = `${origin}:${boardId}`;
  const version = sourceVersion();
  const entry = entries.get(key);
  if (entry && entry.version === version && entry.refreshAt > now) {
    entries.delete(key);
    entries.set(key, entry);
    return Promise.resolve(entry.snapshot);
  }
  const existing = flights.get(key);
  if (existing) return existing.promise;
  if (flights.size >= limits.maxInFlight) return Promise.resolve(failedSnapshot(key, "saturated"));
  const controller = new AbortController();
  const promise = refreshSnapshot(key, origin, limits, version, controller).finally(() => flights.delete(key));
  flights.set(key, { controller, promise });
  return promise;
}

export async function readWidgetSnapshot(context: RequestContext, boardId: BoardId): Promise<WidgetSnapshot> {
  await readAuthorizedBoard(context, boardId);
  context.signal.throwIfAborted();
  if (closed) throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "widget-closed" } });
  const snapshot = await currentSnapshot(context.config.origin, boardId, context.config.widget);
  await readAuthorizedBoard(context, boardId);
  context.signal.throwIfAborted();
  if (closed) throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "widget-closed" } });
  if (snapshot.status !== "unavailable" && Date.parse(snapshot.staleUntil) <= Date.now()) {
    return {
      status: "unavailable",
      generation: snapshot.generation,
      observedAt: null,
      data: null,
      error: snapshot.status === "stale" ? snapshot.error : "source-error",
    };
  }
  return widgetSnapshotSchema.parse(snapshot);
}

export async function controlSource(context: RequestContext, input: SourceControlInput): Promise<SourceControlOutput> {
  authorizeSourceControl(context);
  context.signal.throwIfAborted();
  const parsed = sourceControlInputSchema.safeParse(input);
  if (!parsed.success) throw new ORPCError("BAD_REQUEST", { data: { reason: "source-control-input" } });
  if (closed) throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "widget-closed" } });
  const mode = updateSource(parsed.data);
  return { mode, generation };
}

export async function closeWidgetState(): Promise<void> {
  closed = true;
  closeSourceState();
  entries.clear();
  retainedBytes = 0;
  const pending = [...flights.values()];
  for (const flight of pending) flight.controller.abort();
  await Promise.allSettled(pending.map((flight) => flight.promise));
  flights.clear();
}
