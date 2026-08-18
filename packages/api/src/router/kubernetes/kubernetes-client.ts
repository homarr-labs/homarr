import * as fs from "fs";
import type { NodeMetricsList, RequestContext, ResponseContext } from "@kubernetes/client-node";
import { CoreV1Api, CustomObjectsApi, KubeConfig, NetworkingV1Api, VersionApi } from "@kubernetes/client-node";
import { of } from "@kubernetes/client-node/dist/gen/rxjsStub.js";

import { env } from "../../env";

export interface KubernetesContextStatus {
  contextId: string;
  name: string;
  status: "available" | "degraded" | "unavailable";
  metricsStatus: "available" | "unavailable" | "unknown";
  isDefault: boolean;
}

export const kubernetesContextProbeTimeoutMs = 5_000;

const withKubernetesProbeTimeoutAsync = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeoutError = new Error("Kubernetes context probe timed out");
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort(timeoutError);
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const abortableKubernetesRequest = (signal: AbortSignal) => ({
  middleware: [
    {
      pre: (request: RequestContext) => {
        request.setSignal(signal);
        return of(request);
      },
      post: (response: ResponseContext) => of(response),
    },
  ],
});

export class KubernetesClient {
  private static registry: KubernetesClientRegistry | null = null;
  public kubeConfig: KubeConfig;
  public coreApi: CoreV1Api;
  public networkingApi: NetworkingV1Api;
  public metricsProbeApi: CustomObjectsApi;
  public versionApi: VersionApi;

  public constructor(kubeConfig: KubeConfig) {
    this.kubeConfig = kubeConfig;
    this.coreApi = kubeConfig.makeApiClient(CoreV1Api);
    this.networkingApi = kubeConfig.makeApiClient(NetworkingV1Api);
    this.metricsProbeApi = kubeConfig.makeApiClient(CustomObjectsApi);
    this.versionApi = kubeConfig.makeApiClient(VersionApi);
  }

  public async getNodeMetricsAsync(timeoutMs = kubernetesContextProbeTimeoutMs): Promise<NodeMetricsList> {
    const result: unknown = await withKubernetesProbeTimeoutAsync(
      async (signal) =>
        await this.metricsProbeApi.listClusterCustomObject(
          { group: "metrics.k8s.io", version: "v1beta1", plural: "nodes" },
          abortableKubernetesRequest(signal),
        ),
      timeoutMs,
    );
    return result as NodeMetricsList;
  }

  public static getInstance(contextId: string): KubernetesClient {
    return KubernetesClient.getRegistry().getClient(contextId);
  }

  public static getDefaultInstance(): KubernetesClient {
    return KubernetesClient.getRegistry().getDefaultClient();
  }

  public static async getContextsAsync() {
    return await KubernetesClient.getRegistry().getContextsAsync();
  }

  private static getRegistry() {
    KubernetesClient.registry ??= new KubernetesClientRegistry(loadKubeConfig());
    return KubernetesClient.registry;
  }
}

export class KubernetesClientRegistry {
  private readonly clients = new Map<string, KubernetesClient>();
  private readonly defaultContextId: string;

  public constructor(kubeConfig: KubeConfig) {
    const defaultContextId = kubeConfig.getCurrentContext() || kubeConfig.contexts[0]?.name;
    if (!defaultContextId) throw new Error("No Kubernetes context is configured");
    this.defaultContextId = defaultContextId;

    for (const context of kubeConfig.contexts) {
      const contextConfig = new KubeConfig();
      contextConfig.loadFromOptions({
        clusters: kubeConfig.clusters,
        users: kubeConfig.users,
        contexts: kubeConfig.contexts,
        currentContext: context.name,
      });
      this.clients.set(context.name, new KubernetesClient(contextConfig));
    }
  }

  public getClient(contextId: string) {
    const client = this.clients.get(contextId);
    if (!client) throw new KubernetesContextNotFoundError(contextId);
    return client;
  }

  public getDefaultClient() {
    return this.getClient(this.defaultContextId);
  }

  public async getContextsAsync(timeoutMs = kubernetesContextProbeTimeoutMs) {
    const contexts = await Promise.all(
      [...this.clients.entries()].map(async ([contextId, client]): Promise<KubernetesContextStatus> => {
        const [api, metrics] = await Promise.allSettled([
          withKubernetesProbeTimeoutAsync(
            async (signal) => await client.versionApi.getCode(undefined, abortableKubernetesRequest(signal)),
            timeoutMs,
          ),
          client.getNodeMetricsAsync(timeoutMs),
        ]);
        const status =
          api.status === "rejected" ? "unavailable" : metrics.status === "rejected" ? "degraded" : "available";

        return {
          contextId,
          name: contextId,
          status,
          metricsStatus:
            api.status === "rejected" ? "unknown" : metrics.status === "rejected" ? "unavailable" : "available",
          isDefault: contextId === this.defaultContextId,
        };
      }),
    );

    return { contexts, defaultContextId: this.defaultContextId };
  }
}

export class KubernetesContextNotFoundError extends Error {
  public constructor(contextId: string) {
    super(`Kubernetes context '${contextId}' was not found`);
  }
}

const loadKubeConfig = () => {
  const kubeConfig = new KubeConfig();

  if (process.env.NODE_ENV === "development" || process.env.KUBECONFIG) {
    kubeConfig.loadFromDefault();
    return kubeConfig;
  }

  kubeConfig.loadFromCluster();
  const currentCluster = kubeConfig.getCurrentCluster();
  if (!currentCluster) throw new Error("No cluster configuration found");

  const token = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf8");
  const caData = fs.readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt", "utf8");
  const clusterWithCA = { ...currentCluster, name: `${currentCluster.name}-service-account`, caData };
  const serviceAccountUser = { name: env.KUBERNETES_SERVICE_ACCOUNT_NAME ?? "default-sa", token };
  const currentContext = kubeConfig.getContextObject(kubeConfig.getCurrentContext());
  if (!currentContext) throw new Error("No context found");
  const updatedContext = {
    ...currentContext,
    name: `${currentContext.name}-service-account`,
    cluster: clusterWithCA.name,
    user: serviceAccountUser.name,
  };

  kubeConfig.loadFromOptions({
    clusters: [clusterWithCA],
    users: [serviceAccountUser],
    contexts: [updatedContext],
    currentContext: updatedContext.name,
  });
  return kubeConfig;
};
