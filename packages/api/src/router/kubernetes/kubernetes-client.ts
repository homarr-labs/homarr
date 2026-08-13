import * as fs from "fs";
import { CoreV1Api, KubeConfig, Metrics, NetworkingV1Api, VersionApi } from "@kubernetes/client-node";

import { env } from "../../env";

export interface KubernetesContextStatus {
  contextId: string;
  name: string;
  status: "available" | "degraded" | "unavailable";
  metricsStatus: "available" | "unavailable" | "unknown";
  isDefault: boolean;
}

export class KubernetesClient {
  private static registry: KubernetesClientRegistry | null = null;
  public kubeConfig: KubeConfig;
  public coreApi: CoreV1Api;
  public networkingApi: NetworkingV1Api;
  public metricsApi: Metrics;
  public versionApi: VersionApi;

  public constructor(kubeConfig: KubeConfig) {
    this.kubeConfig = kubeConfig;
    this.coreApi = kubeConfig.makeApiClient(CoreV1Api);
    this.networkingApi = kubeConfig.makeApiClient(NetworkingV1Api);
    this.metricsApi = new Metrics(kubeConfig);
    this.versionApi = kubeConfig.makeApiClient(VersionApi);
  }

  public static getInstance(contextId: string): KubernetesClient {
    return KubernetesClient.getRegistry().getClient(contextId);
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

  public async getContextsAsync() {
    const contexts = await Promise.all(
      [...this.clients.entries()].map(async ([contextId, client]): Promise<KubernetesContextStatus> => {
        const [api, metrics] = await Promise.allSettled([
          client.versionApi.getCode(),
          client.metricsApi.getNodeMetrics(),
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
