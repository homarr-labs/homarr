import { z } from "zod/v4";

const capabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), detail: z.string().optional() }),
  z.object({ status: z.literal("disabled") }),
  z.object({ status: z.literal("unavailable") }),
]);
export const runtimeCapabilitiesSchema = z.object({ kubernetes: capabilitySchema, workshop: capabilitySchema });
export type RuntimeCapabilities = z.infer<typeof runtimeCapabilitiesSchema>;

export interface RuntimeCapabilityResources {
  readonly kubernetesEnabled: boolean;
  readonly workshopApiUrl: string;
  readonly fetch: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;
  getKubernetesVersion(signal: AbortSignal): Promise<{ gitVersion?: string }>;
}

async function withTimeout<Value>(operation: (signal: AbortSignal) => Promise<Value>) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error("Capability probe timed out");
          controller.abort(error);
          reject(error);
        }, 5_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function probeRuntimeCapabilities(resources: RuntimeCapabilityResources): Promise<RuntimeCapabilities> {
  const kubernetesPromise: Promise<RuntimeCapabilities["kubernetes"]> = resources.kubernetesEnabled
    ? withTimeout((signal) => resources.getKubernetesVersion(signal))
        .then((version) => ({ status: "available" as const, detail: version.gitVersion }))
        .catch(() => ({ status: "unavailable" as const }))
    : Promise.resolve({ status: "disabled" as const });
  const workshopPromise = withTimeout(async (signal) => {
    const response = await resources.fetch(`${resources.workshopApiUrl.replace(/\/+$/u, "")}/api/health`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) throw new Error(`Workshop health returned ${response.status}`);
  })
    .then(() => ({ status: "available" as const }))
    .catch(() => ({ status: "unavailable" as const }));
  const [kubernetes, workshop] = await Promise.all([kubernetesPromise, workshopPromise]);
  return { kubernetes, workshop };
}
