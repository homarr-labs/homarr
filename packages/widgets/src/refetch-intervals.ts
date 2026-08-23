import { generatedWidgetOperationPolicies, widgetFeatureCatalog } from "@homarr/definitions";

interface WidgetQueryRefetchInterval {
  queryKey: readonly [readonly string[]];
  intervalSeconds: number | null;
  staleTimeSeconds?: number;
}

const createWidgetQueryRefetchIntervals = (): WidgetQueryRefetchInterval[] => {
  const policies = new Map<string, WidgetQueryRefetchInterval>();

  for (const descriptor of Object.values(widgetFeatureCatalog)) {
    if (!("query" in descriptor) || !("refetchIntervalSeconds" in descriptor.query)) continue;

    for (const path of descriptor.query.paths) {
      if (path[0] !== "widget" && path[0] !== "docker") continue;

      const queryKey = [path] as const;
      const serializedQueryKey = JSON.stringify(queryKey);
      const intervalSeconds = descriptor.query.refetchIntervalSeconds;
      const existing = policies.get(serializedQueryKey);
      if (existing && existing.intervalSeconds !== intervalSeconds) {
        throw new Error(`Conflicting widget refetch intervals for ${serializedQueryKey}`);
      }
      policies.set(serializedQueryKey, { queryKey, intervalSeconds });
    }
  }

  for (const policy of generatedWidgetOperationPolicies) {
    if (policy.kind !== "query") continue;
    if (policy.path[0] !== "widget" && policy.path[0] !== "docker") continue;

    const queryKey = [policy.path] as const;
    const serializedQueryKey = JSON.stringify(queryKey);
    let existing = policies.get(serializedQueryKey);
    if (!existing) {
      if (policy.refetchIntervalSeconds === undefined) continue;
      existing = { queryKey, intervalSeconds: policy.refetchIntervalSeconds };
    }
    if (
      existing.intervalSeconds !== undefined &&
      policy.refetchIntervalSeconds !== undefined &&
      existing.intervalSeconds !== policy.refetchIntervalSeconds
    ) {
      throw new Error(`Conflicting generated widget refetch interval for ${serializedQueryKey}`);
    }
    if (policy.refetchIntervalSeconds !== undefined) {
      existing.intervalSeconds = policy.refetchIntervalSeconds;
    }
    if (policy.staleTimeSeconds !== undefined) existing.staleTimeSeconds = policy.staleTimeSeconds;
    policies.set(serializedQueryKey, existing);
  }

  return [...policies.values()];
};

/**
 * Query policy used by the root client provider. This derives from the
 * server-safe feature catalog and never imports widget definitions or code.
 */
export const widgetQueryRefetchIntervals = createWidgetQueryRefetchIntervals();
