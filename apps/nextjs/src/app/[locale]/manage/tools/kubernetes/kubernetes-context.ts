import { cache } from "react";

import { api } from "@homarr/api/server";

export const getKubernetesContextsAsync = cache(() => api.kubernetes.contexts.getContexts());

export interface KubernetesContextSearchParams {
  context?: string | string[];
}

export const getSelectedKubernetesContextAsync = async (searchParams: Promise<KubernetesContextSearchParams>) => {
  const [{ context }, result] = await Promise.all([searchParams, getKubernetesContextsAsync()]);
  const requestedContextId = Array.isArray(context) ? context[0] : context;
  const selected =
    result.contexts.find(({ contextId }) => contextId === requestedContextId) ??
    result.contexts.find(({ contextId }) => contextId === result.defaultContextId) ??
    result.contexts[0];
  if (!selected) throw new Error("No Kubernetes context is configured");
  return selected;
};
