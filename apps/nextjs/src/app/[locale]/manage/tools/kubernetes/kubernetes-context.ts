import { api } from "@homarr/api/server";

export interface KubernetesContextSearchParams {
  context?: string | string[];
}

export const getSelectedKubernetesContextAsync = async (searchParams: Promise<KubernetesContextSearchParams>) => {
  const [{ context }, result] = await Promise.all([searchParams, api.kubernetes.contexts.getContexts()]);
  const requestedContextId = Array.isArray(context) ? context[0] : context;
  const selected =
    result.contexts.find(({ contextId }) => contextId === requestedContextId) ??
    result.contexts.find(({ contextId }) => contextId === result.defaultContextId) ??
    result.contexts[0];
  if (!selected) throw new Error("No Kubernetes context is configured");
  return selected;
};
