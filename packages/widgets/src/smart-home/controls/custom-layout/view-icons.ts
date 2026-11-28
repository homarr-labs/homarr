import {
  IconAdjustmentsHorizontal,
  IconArrowsHorizontal,
  IconArrowsVertical,
  IconBattery2,
  IconChartLine,
  IconCircleDot,
  IconHandClick,
  IconHeading,
  IconLayoutDashboard,
  IconList,
  IconNumber,
  IconProgress,
  IconSeparator,
  IconSpace,
  IconSum,
  IconTag,
  IconVideo,
} from "@tabler/icons-react";

import type { TablerIcon } from "@homarr/ui";

import type { SmartHomeElementView } from "./schema";

/** One icon per element view, the same in the insert bar, the "shown as" choice and the element lists. */
export const viewIcons: Record<SmartHomeElementView, TablerIcon> = {
  pill: IconArrowsVertical,
  slider: IconArrowsHorizontal,
  control: IconAdjustmentsHorizontal,
  button: IconHandClick,
  tile: IconLayoutDashboard,
  camera: IconVideo,
  value: IconNumber,
  graph: IconChartLine,
  group: IconSum,
  row: IconList,
  status: IconCircleDot,
  chip: IconTag,
  battery: IconBattery2,
  progress: IconProgress,
  heading: IconHeading,
  divider: IconSeparator,
  spacer: IconSpace,
};

/** What the insert bar offers, in groups: controls, readings, structure. */
export const insertViewGroups: readonly (readonly SmartHomeElementView[])[] = [
  ["pill", "slider", "control", "button", "tile", "camera"],
  ["value", "graph", "group", "row", "status", "chip", "battery", "progress"],
  ["heading", "divider", "spacer"],
];

/** Entities an element of this view can show, to narrow the picker right after it was added. */
export const getViewDomains = (view: SmartHomeElementView): readonly string[] | undefined => {
  if (view === "graph") return ["sensor", "number"];
  if (view === "camera") return ["camera"];
  return undefined;
};
