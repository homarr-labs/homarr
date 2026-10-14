import { ORPCError } from "@orpc/server";

import { sourceControlInputSchema } from "../../contracts/schemas";
import type { SourceControlInput, SourcePayload } from "../../contracts/schemas";
import type { FixtureConfig } from "../context/config";
import { readBoundedJson, WidgetSourceError } from "./body";

let source: SourceControlInput = { mode: "healthy", value: 42 };
let version = 0;
let closed = false;
const delays = new Set<AbortController>();
const controlReads = new Set<AbortController>();

export function sourceVersion(): number {
  return version;
}

export function updateSource(input: SourceControlInput): SourceControlInput["mode"] {
  if (closed || version === Number.MAX_SAFE_INTEGER) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "source-closed" } });
  }
  source = sourceControlInputSchema.parse(input);
  version += 1;
  return source.mode;
}

export async function readSource(signal: AbortSignal, limits: FixtureConfig["widget"]): Promise<SourcePayload> {
  if (closed) throw new WidgetSourceError("source-error");
  const captured = source;
  if (captured.mode === "error") throw new WidgetSourceError("source-error");
  if (captured.mode === "healthy") return { data: { value: captured.value, unit: "items" } };
  if (delays.size >= limits.maxInFlight) throw new WidgetSourceError("saturated");
  const controller = new AbortController();
  delays.add(controller);
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  try {
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        controller.signal.removeEventListener("abort", finish);
        resolve();
      };
      const timer = setTimeout(finish, limits.timeoutMs * 2);
      controller.signal.addEventListener("abort", finish, { once: true });
      if (signal.aborted || closed) controller.abort();
    });
    throw new WidgetSourceError("timeout");
  } finally {
    signal.removeEventListener("abort", abort);
    delays.delete(controller);
  }
}

export async function readControlInput(request: Request, limits: FixtureConfig["widget"]): Promise<SourceControlInput> {
  if (closed || controlReads.size >= limits.maxInFlight) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "source-control-saturated" } });
  }
  const controller = new AbortController();
  controlReads.add(controller);
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, limits.timeoutMs);
  try {
    if (request.signal.aborted) controller.abort();
    const input = sourceControlInputSchema.safeParse(
      await readBoundedJson(request.body, request.headers, limits.maxResponseBytes, controller.signal),
    );
    if (!input.success) throw new WidgetSourceError("invalid-response");
    return input.data;
  } catch {
    throw new ORPCError("BAD_REQUEST", { data: { reason: "source-control-input" } });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    controlReads.delete(controller);
  }
}

export function closeSourceState(): void {
  closed = true;
  for (const controller of delays) controller.abort();
  for (const controller of controlReads) controller.abort();
  delays.clear();
  controlReads.clear();
}
