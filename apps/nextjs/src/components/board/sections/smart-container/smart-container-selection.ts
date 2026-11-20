import type { SmartContainerOptions, SmartContainerState } from "@homarr/validation/smart-container";
import { resolveSmartContainerMembership } from "@homarr/validation/smart-container";
import { getWidgetRelevance } from "@homarr/widgets/activity";
import type { WidgetActivities, WidgetRelevance } from "@homarr/widgets/activity";

export interface ResolvedSmartContainerState extends SmartContainerState {
  activity: "active" | "quiet" | "unknown";
  relevance: WidgetRelevance;
}

const relevanceOrder: readonly WidgetRelevance[] = ["playback", "ongoing", "background", "unknown", "quiet"];
const positiveRelevance: readonly WidgetRelevance[] = ["playback", "ongoing", "background"];

export const resolveSmartContainerStates = (
  states: readonly SmartContainerState[],
  itemIds: ReadonlySet<string>,
  activities: WidgetActivities,
  now: number,
): ResolvedSmartContainerState[] =>
  resolveSmartContainerMembership(states, itemIds).map((state) => {
    const relevances = state.itemIds.map((id) => getWidgetRelevance(activities[id], now));
    const relevance = relevanceOrder.find((tier) => relevances.includes(tier)) ?? "quiet";
    let activity: ResolvedSmartContainerState["activity"] = "active";
    if (relevance === "quiet" || relevance === "unknown") activity = relevance;
    return { ...state, activity, relevance };
  });

export const selectSmartContainerPolicy = (
  states: readonly ResolvedSmartContainerState[],
  options: Pick<SmartContainerOptions, "mode" | "skipInactive" | "fallbackStateId">,
  currentId: string | undefined,
) => {
  const enabled = states.filter((state) => state.enabled);
  const current = enabled.find((state) => state.id === currentId);
  const fallback = enabled.find((state) => state.id === options.fallbackStateId);
  const tier = positiveRelevance.find((relevance) => enabled.some((state) => state.relevance === relevance));
  const matching = enabled.filter((state) => tier && state.relevance === tier);
  const priority = Math.max(...matching.map((state) => state.priority));
  const leaders = matching.filter((state) => state.priority === priority);
  const preferred =
    leaders.find((state) => state.id === currentId) ??
    leaders[0] ??
    fallback ??
    (current?.relevance === "unknown" ? current : undefined) ??
    enabled[0];
  let rotationStates: readonly ResolvedSmartContainerState[] = [];
  let target = preferred;
  if (options.mode === "timed") {
    rotationStates = enabled.filter((state) => !options.skipInactive || state.relevance !== "quiet");
    target =
      rotationStates.find((state) => state.id === currentId) ?? rotationStates[0] ?? current ?? fallback ?? enabled[0];
  } else if (options.mode === "hybrid") {
    rotationStates = leaders;
  }
  if (options.mode === "manual") target = current;
  const currentIndex = rotationStates.findIndex((state) => state.id === currentId);
  const next = rotationStates[(currentIndex + 1) % rotationStates.length];
  const moreRelevant = Boolean(
    target && current && relevanceOrder.indexOf(target.relevance) < relevanceOrder.indexOf(current.relevance),
  );
  return { target, next, moreRelevant, canRotate: rotationStates.length > 1 };
};
