import { setTimeout as delay } from "node:timers/promises";
import { TRPCError } from "@trpc/server";

import { createId } from "@homarr/common";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

const localLocks = new Set<string>();
let redis: ReturnType<typeof createRedisClient> | undefined;
const leaseMs = 30_000;
const releaseScript = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0";
const extendScript =
  "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end return 0";

/** Serialize managed mutations and activation across replicas. Never retry the supplied operation. */
export async function withWidgetInstallationLock<T>(
  id: string,
  operation: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const local = process.env.CI !== undefined || process.env.NODE_ENV === "test";
  const key = `custom-widget:installation-lock:${id}`;
  const token = createId();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const deadline = Date.now() + 30_000;
  let acquired = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    while (!acquired) {
      controller.signal.throwIfAborted();
      if (local) {
        acquired = !localLocks.has(key);
        if (acquired) localLocks.add(key);
      } else {
        redis ??= createRedisClient();
        acquired = (await redis.set(key, token, "PX", leaseMs, "NX")) === "OK";
      }
      if (acquired) break;
      if (Date.now() >= deadline)
        throw new TRPCError({
          code: "TIMEOUT",
          message: "The widget is still finishing another managed change. Try again.",
        });
      await delay(100, undefined, { signal: controller.signal });
    }
    if (!local) {
      const leaseClient = (redis ??= createRedisClient());
      heartbeat = setInterval(() => {
        void leaseClient
          .eval(extendScript, 1, key, token, leaseMs)
          .then((renewed) => {
            if (!Number(renewed)) controller.abort(new Error("Widget mutation lease expired"));
          })
          .catch(() => controller.abort(new Error("Widget coordination unavailable")));
      }, leaseMs / 3);
      heartbeat.unref();
    }
    controller.signal.throwIfAborted();
    // The operation checks the lease before committing. A completed mutation must not be reported as
    // failed merely because cancellation arrives while its successful result is returning.
    return await operation(controller.signal);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    signal?.removeEventListener("abort", abort);
    if (acquired) {
      if (local) localLocks.delete(key);
      else await redis?.eval(releaseScript, 1, key, token).catch(() => undefined);
    }
  }
}
