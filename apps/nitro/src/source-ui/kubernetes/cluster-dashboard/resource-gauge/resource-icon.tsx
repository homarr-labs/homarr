import { IconCpu, IconCube, IconDeviceDesktopAnalytics } from "@tabler/icons-react";
import type { ComponentType } from "react";

import { invariantTechnicalLabels } from "@homarr/definitions";
import type { KubernetesCapacityType } from "@homarr/definitions";

const resourceIcons = {
  [invariantTechnicalLabels.cpu]: IconCpu,
  Memory: IconDeviceDesktopAnalytics,
  Pods: IconCube,
} satisfies Record<KubernetesCapacityType, ComponentType<{ size: number; stroke: number }>>;

export function ResourceIcon({
  type,
  size = 32,
  stroke = 1.5,
}: {
  type: KubernetesCapacityType;
  size?: number;
  stroke?: number;
}) {
  const Icon = resourceIcons[type];
  return <Icon size={size} stroke={stroke} />;
}
