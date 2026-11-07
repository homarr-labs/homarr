import type { SmartContainerOptions, SmartContainerState } from "@homarr/validation/smart-container";
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
  state: SmartContainerState | undefined;
  items: readonly SmartContainerItem[];
  columnCount: number;
  rowBudget: number;
  options: SmartContainerOptions;
  authored: boolean;
  activities: WidgetActivities;
  now?: number;
}

const getItemDemand = (
  item: SmartContainerItem,
  options: SmartContainerOptions,
  activities: WidgetActivities,
  now: number,
) => {
  const activity = activities[item.id];
  const status = getWidgetActivity(activity, now);
  if (status === "quiet" && options.compactQuiet) return { min: 1, max: 1, authoredWidth: false };
  if (status === "active" && activity) {
    return {
      min: options.minActiveRows,
      max: Math.max(options.minActiveRows, Math.min(options.maxActiveRows, activity.requestedRows)),
      authoredWidth: false,
    };
  }
  return { min: item.height, max: item.height, authoredWidth: true };
};

/** Keep every widget reachable while sharing the selected state's finite row budget. */
export const projectSmartContainerState = ({
  state,
  items,
  columnCount,
  rowBudget,
  options,
  authored,
  activities,
  now = Date.now(),
}: ProjectStateInput) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const selectedItems = (state?.itemIds ?? []).flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    return [item];
  });
  const itemIds = selectedItems.map((item) => item.id);
  const placements = new Map<string, SmartContainerPlacement>();
  if (authored) {
    for (const item of selectedItems) {
      placements.set(item.id, { x: item.xOffset, y: item.yOffset, w: item.width, h: item.height });
    }
    const rowCount = Math.max(1, ...selectedItems.map((item) => item.yOffset + item.height));
    return { placements, itemIds, rowCount };
  }
  const demands = selectedItems.map((item) => getItemDemand(item, options, activities, now));
  const heights = demands.map((demand) => demand.min);
  const weights = demands.map((demand) => demand.max - demand.min);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const minimumRows = heights.reduce((total, height) => total + height, 0);
  let remaining = Math.min(totalWeight, Math.max(0, rowBudget - minimumRows));

  if (totalWeight > 0) {
    const shares = weights.map((weight) => (remaining * weight) / totalWeight);
    shares.forEach((share, index) => {
      const whole = Math.floor(share);
      heights[index] = (heights[index] ?? 1) + whole;
      remaining -= whole;
    });
    const remainderOrder = shares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .filter(({ fraction }) => fraction > 0)
      .toSorted((left, right) => right.fraction - left.fraction);
    for (const { index } of remainderOrder) {
      if (remaining <= 0) break;
      heights[index] = (heights[index] ?? 1) + 1;
      remaining -= 1;
    }
  }

  let rowOffset = 0;
  selectedItems.forEach((item, index) => {
    const height = heights[index] ?? 1;
    if (demands[index]?.authoredWidth) {
      placements.set(item.id, { x: item.xOffset, y: rowOffset, w: item.width, h: height });
    } else {
      placements.set(item.id, { x: 0, y: rowOffset, w: columnCount, h: height });
    }
    rowOffset += height;
  });

  return { placements, itemIds, rowCount: Math.max(rowOffset, 1) };
};
