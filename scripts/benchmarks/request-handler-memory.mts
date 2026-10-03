import { createIntegrationRequestHandler } from "../../packages/request-handler/src/lib/integration-request-handler.ts";
import { createRequestHandler } from "../../packages/request-handler/src/lib/request-handler.ts";

const allocations = Number(process.env.REQUEST_MEMORY_ALLOCATIONS ?? 64);
const allocationBytes = Number(process.env.REQUEST_MEMORY_ALLOCATION_BYTES ?? 1024 * 1024);
const maxRetainedBytes = Number(process.env.REQUEST_MEMORY_MAX_RETAINED_BYTES ?? 16 * 1024 * 1024);
const positiveTtlMs = Number(process.env.REQUEST_MEMORY_POSITIVE_TTL_MS ?? 25);

if (!globalThis.gc) throw new Error("Run this benchmark with node --expose-gc");
if (!Number.isInteger(allocations) || allocations < 2) throw new Error("REQUEST_MEMORY_ALLOCATIONS must be >= 2");
if (!Number.isInteger(allocationBytes) || allocationBytes < 1) {
  throw new Error("REQUEST_MEMORY_ALLOCATION_BYTES must be positive");
}

const collectGarbage = async () => {
  for (let index = 0; index < 4; index++) {
    globalThis.gc?.();
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const retainedRoots: unknown[] = [];
const measureArrayBufferGrowthAsync = async (workload: () => Promise<unknown>) => {
  await collectGarbage();
  const before = process.memoryUsage().arrayBuffers;
  const retainedRoot = await workload();
  retainedRoots.push(retainedRoot);
  await collectGarbage();
  const growth = process.memoryUsage().arrayBuffers - before;
  retainedRoots.pop();
  return growth;
};

const zeroTtlGrowthBytes = await measureArrayBufferGrowthAsync(async () => {
  const handler = createRequestHandler<Uint8Array, { id: number }>({
    cacheTtlMs: 0,
    requestAsync: async () => new Uint8Array(allocationBytes),
  });
  for (let id = 0; id < allocations; id++) {
    await handler.handler({ id }).getDataAsync();
  }
  return handler;
});

const integrationGrowthBytes = await measureArrayBufferGrowthAsync(async () => {
  const handler = createIntegrationRequestHandler<number, "mock", Record<string, never>>({
    cacheTtlMs: 0,
    requestAsync: async (integration) =>
      (integration as typeof integration & { benchmarkPayload: Uint8Array }).benchmarkPayload.byteLength,
  });
  for (let id = 0; id < allocations; id++) {
    await handler
      .handler(
        {
          id: `benchmark-${id}`,
          kind: "mock",
          name: "benchmark",
          url: "http://benchmark.invalid",
          externalUrl: null,
          decryptedSecrets: [],
          benchmarkPayload: new Uint8Array(allocationBytes),
        } as never,
        {},
      )
      .getDataAsync();
  }
  return handler;
});

const expiredPositiveTtlGrowthBytes = await measureArrayBufferGrowthAsync(async () => {
  const handler = createRequestHandler<Uint8Array, { id: number }>({
    cacheTtlMs: positiveTtlMs,
    requestAsync: async () => new Uint8Array(allocationBytes),
  });
  for (let id = 0; id < allocations; id++) {
    await handler.handler({ id }).getDataAsync();
  }
  await new Promise((resolve) => setTimeout(resolve, positiveTtlMs + 25));
  return handler;
});

const positiveControlGrowthBytes = await measureArrayBufferGrowthAsync(async () =>
  Array.from({ length: allocations }, () => new Uint8Array(allocationBytes)),
);
const positiveControlMinimumBytes = allocations * allocationBytes * 0.8;

const result = {
  allocations,
  allocationBytes,
  allocatedPerScenarioBytes: allocations * allocationBytes,
  maxRetainedBytes,
  positiveTtlMs,
  zeroTtlGrowthBytes,
  integrationGrowthBytes,
  expiredPositiveTtlGrowthBytes,
  positiveControlGrowthBytes,
  positiveControlMinimumBytes,
  zeroTtlPass: zeroTtlGrowthBytes <= maxRetainedBytes,
  integrationPass: integrationGrowthBytes <= maxRetainedBytes,
  expiredPositiveTtlPass: expiredPositiveTtlGrowthBytes <= maxRetainedBytes,
  positiveControlPass: positiveControlGrowthBytes >= positiveControlMinimumBytes,
};

console.log(JSON.stringify(result, null, 2));
if (!result.zeroTtlPass || !result.integrationPass || !result.expiredPositiveTtlPass || !result.positiveControlPass) {
  process.exitCode = 1;
}
