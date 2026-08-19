import type { RequestContext, ResponseContext } from "@kubernetes/client-node";

import { KubernetesClient } from "../kubernetes/kubernetes-client";

export type RuntimeCapability =
  | { status: "available"; detail?: string }
  | { status: "disabled" }
  | { status: "unavailable" };

export interface RuntimeCapabilities {
  kubernetes: RuntimeCapability;
  workshop: RuntimeCapability;
}

const capabilityProbeTimeoutMs = 5_000;

const withTimeoutAsync = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = capabilityProbeTimeoutMs,
) => {
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
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const probeRuntimeCapabilitiesAsync = async ({
  kubernetesEnabled,
  workshopApiUrl,
  fetchImpl = fetch,
  getKubernetesVersionAsync = async (signal) =>
    await KubernetesClient.getDefaultInstance().versionApi.getCode({
      middleware: [
        {
          pre: async (request: RequestContext) => {
            request.setSignal(signal);
            return request;
          },
          post: async (response: ResponseContext) => response,
        },
      ],
    }),
}: {
  kubernetesEnabled: boolean;
  workshopApiUrl: string;
  fetchImpl?: typeof fetch;
  getKubernetesVersionAsync?: (signal: AbortSignal) => Promise<{ gitVersion?: string }>;
}): Promise<RuntimeCapabilities> => {
  const kubernetesPromise: Promise<RuntimeCapability> = kubernetesEnabled
    ? withTimeoutAsync(getKubernetesVersionAsync)
        .then((version) => ({ status: "available" as const, detail: version.gitVersion }))
        .catch(() => ({ status: "unavailable" as const }))
    : Promise.resolve({ status: "disabled" as const });
  const workshopPromise: Promise<RuntimeCapability> = withTimeoutAsync(
    async (signal) =>
      await fetchImpl(`${workshopApiUrl.replace(/\/+$/u, "")}/api/health`, {
        headers: { Accept: "application/json" },
        signal,
      }).then((response) => {
        if (!response.ok) throw new Error(`Workshop health returned ${response.status}`);
      }),
  )
    .then(() => ({ status: "available" as const }))
    .catch(() => ({ status: "unavailable" as const }));

  const [kubernetes, workshop] = await Promise.all([kubernetesPromise, workshopPromise]);
  return { kubernetes, workshop };
};
