import { AsyncLocalStorage } from "node:async_hooks";

import type { IntegrationRuntimeResources } from "./contracts";

const runtime = new AsyncLocalStorage<IntegrationRuntimeResources>();

export const getIntegrationRuntimeResources = () => runtime.getStore();

export const requireIntegrationRuntimeResources = () => {
  const resources = getIntegrationRuntimeResources();
  if (!resources) throw new Error("Integration runtime resources are required");
  return resources;
};

export const withIntegrationRuntimeAsync = <T>(resources: IntegrationRuntimeResources, operation: () => Promise<T>) => {
  resources.context.signal.throwIfAborted();
  return runtime.run(resources, () => resources.transport.runAsync(resources.context, operation));
};
