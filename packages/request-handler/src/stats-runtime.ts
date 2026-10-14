import { z } from "zod/v4";

import type { IntegrationKind } from "@homarr/definitions";
import type { StatsValue } from "@homarr/integrations/stats";
import type { StateChannels, StateDiagnostics, StateGenerations } from "@homarr/redis/state";

import type { IntegrationOfKind } from "./lib/integration-request-runtime";

const FRESH_MS = 60 * 60 * 1000;
const RETRY_MS = 60_000;
const MAX_PENDING = 128;
const pauseAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const snapshotSchema = z.object({
  identity: z.string(),
  values: z.record(z.string(), z.union([z.number().finite(), z.string().max(4096), z.boolean(), z.null()])),
  updatedAt: z.number().nullable(),
  retryAt: z.number(),
  error: z.boolean(),
});
type Snapshot = z.infer<typeof snapshotSchema>;
export type StatisticsInput = IntegrationOfKind<IntegrationKind>;
type Input = StatisticsInput;

export interface StatisticsResources {
  channels: StateChannels;
  generations: Pick<StateGenerations, "getIntegrationCacheGenerationAsync">;
  diagnostics: StateDiagnostics;
  getIdentity(integration: Input): string;
  fetchStatsAsync(integration: Input, signal: AbortSignal): Promise<Record<string, StatsValue>>;
  getStatsMetrics(kind: IntegrationKind): readonly { key: string }[];
  getDemoStatsValues(integration: Pick<Input, "kind" | "url">): Record<string, StatsValue> | undefined;
}

export const createStatisticsSnapshotService = (resources: StatisticsResources) => {
  const { createGetSetChannel, createLockChannel } = resources.channels;
  const { getIntegrationCacheGenerationAsync } = resources.generations;
  const { getDemoStatsValues, getStatsMetrics } = resources;
  const running = new Map<string, Promise<void>>();
  const controllers = new Set<AbortController>();
  let stopped = false;

  const resolveAsync = async (integration: Input) => {
    const generation = await getIntegrationCacheGenerationAsync(integration.id);
    if (!generation.isShared) throw new Error("Statistics cache is temporarily unavailable");
    const identity = resources.getIdentity(integration);
    const name = `integration-stats:snapshot:v1:${integration.id}`;
    const channel = createGetSetChannel<Snapshot>(name);
    const parsed = snapshotSchema.safeParse(await channel.getAsync());
    let snapshot: Snapshot = { identity, values: {}, updatedAt: null, retryAt: 0, error: false };
    if (parsed.success && (parsed.data.identity === identity || parsed.data.identity.endsWith(`:${identity}`)))
      snapshot = { ...parsed.data, identity };
    return { identity, generation: generation.value, fence: generation.fence, name, channel, snapshot };
  };

  const getStatsSnapshotAsync = async (integration: Input) => {
    if (stopped) throw new Error("Statistics service is stopped");
    const demo = getDemoStatsValues(integration);
    if (demo) {
      return {
        values: demo,
        updatedAt: Date.now(),
        retryAt: 0,
        error: false,
        stale: false,
      };
    }

    const { snapshot } = await resolveAsync(integration);
    if (stopped) throw new Error("Statistics service is stopped");
    return {
      values: snapshot.values,
      updatedAt: snapshot.updatedAt,
      retryAt: snapshot.retryAt,
      error: snapshot.error,
      stale: snapshot.updatedAt === null || Date.now() - snapshot.updatedAt >= FRESH_MS,
    };
  };

  const refreshStatsAsync = async (integration: Input, force: boolean) => {
    if (stopped) throw new Error("Statistics service is stopped");
    const key = integration.id;
    const pending = running.get(key);
    if (pending) return await pending;
    if (running.size >= MAX_PENDING) throw new Error("Statistics refresh queue is full");
    const work = runRefreshAsync(integration, force).finally(() => running.delete(key));
    running.set(key, work);
    return await work;
  };

  const runRefreshAsync = async (integration: Input, force: boolean) => {
    const initial = await resolveAsync(integration);
    if (!force && initial.snapshot.retryAt > Date.now()) return;
    if (!force && initial.snapshot.updatedAt !== null && Date.now() - initial.snapshot.updatedAt < FRESH_MS) return;
    const lock = createLockChannel(`integration-stats:lock:${integration.id}`);
    const token = await lock.acquireAsync(120);
    if (!token) return;
    let slot: ReturnType<typeof createLockChannel> | undefined;
    let slotToken: string | undefined;
    let owned = true;
    const controller = new AbortController();
    controllers.add(controller);
    if (stopped) controller.abort(new Error("Statistics service is stopped"));
    const renewal = setInterval(() => {
      void (async () => {
        if (!(await lock.renewAsync(token, 120))) owned = false;
        if (slot && slotToken && !(await slot.renewAsync(slotToken, 120))) owned = false;
        if (!owned) controller.abort();
      })().catch(() => {
        owned = false;
        controller.abort();
      });
    }, 10_000);
    renewal.unref?.();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const waitUntil = Date.now() + 60_000;
      while (!slot && Date.now() < waitUntil) {
        if (!owned || controller.signal.aborted) break;
        for (let index = 0; index < 4; index += 1) {
          const candidate = createLockChannel(`integration-stats:slot:${index}`);
          const acquired = await candidate.acquireAsync(120);
          if (!acquired) continue;
          slot = candidate;
          slotToken = acquired;
          break;
        }
        if (!slot) await pauseAsync();
      }
      if (!slot || !owned || controller.signal.aborted) return;
      const current = await resolveAsync(integration);
      if (current.identity !== initial.identity || current.generation !== initial.generation) return;
      if (!force && current.snapshot.updatedAt !== null && Date.now() - current.snapshot.updatedAt < FRESH_MS) return;
      deadline = setTimeout(() => controller.abort(), 60_000);
      deadline.unref?.();
      try {
        const raw = getDemoStatsValues(integration) ?? (await fetchBeforeAbortAsync(integration, controller.signal));
        controller.signal.throwIfAborted();
        const values: Snapshot["values"] = {};
        for (const metric of getStatsMetrics(integration.kind)) values[metric.key] = raw[metric.key] ?? null;
        const snapshot = snapshotSchema.parse({
          identity: initial.identity,
          values,
          updatedAt: Date.now(),
          retryAt: 0,
          error: false,
        });
        const latest = await resolveAsync(integration);
        if (!stopped && owned && latest.identity === initial.identity && latest.generation === initial.generation)
          await lock.setPersistentIfOwnedAsync(token, initial.name, snapshot, initial.fence);
      } catch {
        controller.abort();
        resources.diagnostics.warn("Statistics source refresh failed", {
          integrationId: integration.id,
          kind: integration.kind,
        });
        const latest = await resolveAsync(integration);
        if (!stopped && owned && latest.identity === initial.identity && latest.generation === initial.generation) {
          await lock.setPersistentIfOwnedAsync(
            token,
            initial.name,
            {
              ...current.snapshot,
              retryAt: Date.now() + RETRY_MS,
              error: true,
            },
            initial.fence,
          );
        }
      }
    } finally {
      controller.abort();
      controllers.delete(controller);
      clearInterval(renewal);
      if (deadline) clearTimeout(deadline);
      const releases = [lock.releaseAsync(token)];
      if (slot && slotToken) releases.push(slot.releaseAsync(slotToken));
      await Promise.allSettled(releases);
    }
  };

  const fetchBeforeAbortAsync = async (integration: Input, signal: AbortSignal) => {
    signal.throwIfAborted();
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
      return await Promise.race([resources.fetchStatsAsync(integration, signal), aborted]);
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
  };
  return {
    getStatsSnapshotAsync,
    refreshStatsAsync,
    stopAsync: async () => {
      stopped = true;
      for (const controller of controllers) controller.abort(new Error("Statistics service is stopped"));
      await Promise.allSettled(running.values());
    },
  };
};
