import { cache } from "react";
import { cookies } from "next/headers";

import { api } from "@homarr/api/server";

import { kubernetesContextCookieName } from "./kubernetes-context.constants";

export const getKubernetesContextsAsync = cache(() => api.kubernetes.contexts.getContexts());

export interface KubernetesContextSearchParams {
  context?: string | string[];
}

export const getSelectedKubernetesContextAsync = async (searchParams: Promise<KubernetesContextSearchParams>) => {
  const [{ context }, result, cookieStore] = await Promise.all([searchParams, getKubernetesContextsAsync(), cookies()]);
  const requestedContextId = Array.isArray(context) ? context[0] : context;
  const storedContextId = cookieStore.get(kubernetesContextCookieName)?.value;
  const selected =
    result.contexts.find(({ contextId }) => contextId === requestedContextId) ??
    result.contexts.find(({ contextId }) => contextId === storedContextId) ??
    result.contexts.find(({ contextId }) => contextId === result.defaultContextId) ??
    result.contexts[0];
  if (!selected) throw new Error("No Kubernetes context is configured");
  return selected;
};
