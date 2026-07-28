import type { CustomJsxRequestCapability } from "@homarr/custom-widgets/runtime";

export interface CustomWidgetInvalidationTargets {
  all: boolean;
  requestIds: string[];
  loadRequestIds: string[];
  refreshParent: boolean;
}

export function resolveCustomWidgetInvalidationTargets(
  capabilities: readonly CustomJsxRequestCapability[],
  targets: readonly string[],
): CustomWidgetInvalidationTargets {
  const queries = capabilities.filter((request) => request.kind === "query");
  const all = targets.includes("*");
  const requested = new Set(targets);
  const requestIds = queries.flatMap((request) => (all || requested.has(request.id) ? [request.id] : []));
  const loadRequestIds = queries.flatMap((request) =>
    request.trigger === "load" && (all || requested.has(request.id)) ? [request.id] : [],
  );
  return {
    all,
    requestIds,
    loadRequestIds,
    refreshParent: requested.has("parent") || all || loadRequestIds.length > 0,
  };
}
