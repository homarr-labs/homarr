import type { SmartContainerState } from "@homarr/validation/smart-container";
import { getWidgetActivity } from "@homarr/widgets/activity";
import type { WidgetActivities } from "@homarr/widgets/activity";

export interface SmartContainerItem {
  id: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export interface SmartContainerPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ProjectStateInput {
  state: SmartContainerState;
  items: readonly SmartContainerItem[];
  columnCount: number;
  rowBudget: number;
  reclaimSpace: boolean;
  activities: WidgetActivities;
  now?: number;
}

const getItemDemand = (item: SmartContainerItem, activities: WidgetActivities, now: number) => {
  const activity = activities[item.id];
  const status = getWidgetActivity(activity, now);
  if (status === "quiet") return 1;
  if (status === "active" && activity) return Math.max(2, Math.min(12, activity.count + 1));
  return Math.max(1, item.height);
};

/** Keep every widget reachable while sharing the selected state's finite row budget. */
export const projectSmartContainerState = ({
  state,
  items,
  columnCount,
  rowBudget,
  reclaimSpace,
  activities,
  now = Date.now(),
}: ProjectStateInput) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const selectedItems = state.itemIds.flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    return [item];
  });
  const demands = selectedItems.map((item) => getItemDemand(item, activities, now));
  const naturalRowCount = demands.reduce((total, height) => total + height, 0);
  let budget = Math.max(selectedItems.length, Math.round(rowBudget), 1);
  if (reclaimSpace) budget = Math.min(budget, Math.max(naturalRowCount, 1));
  const heights = selectedItems.map(() => 1);
  let remaining = budget - selectedItems.length;
  const weights = demands.map((demand) => Math.max(demand - 1, 0));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight > 0) {
    const shares = weights.map((weight) => (remaining * weight) / totalWeight);
    shares.forEach((share, index) => {
      const whole = Math.floor(share);
      heights[index] = (heights[index] ?? 1) + whole;
      remaining -= whole;
    });
    const remainderOrder = shares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .toSorted((left, right) => right.fraction - left.fraction);
    for (const { index } of remainderOrder) {
      if (remaining <= 0) break;
      heights[index] = (heights[index] ?? 1) + 1;
      remaining -= 1;
    }
  } else if (!reclaimSpace && heights.length > 0) {
    let index = 0;
    while (remaining > 0) {
      heights[index] = (heights[index] ?? 1) + 1;
      remaining -= 1;
      index = (index + 1) % heights.length;
    }
  }

  let y = 0;
  const placements = new Map<string, SmartContainerPlacement>();
  selectedItems.forEach((item, index) => {
    const height = heights[index] ?? 1;
    placements.set(item.id, { x: 0, y, w: columnCount, h: height });
    y += height;
  });

  return { placements, itemIds: selectedItems.map((item) => item.id), rowCount: Math.max(y, 1) };
};
