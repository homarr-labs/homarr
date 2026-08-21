import React from "react";
import { IconCpu, IconCube, IconDeviceDesktopAnalytics } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";
import type { KubernetesCapacityType } from "@homarr/definitions";

const resourceIcons = {
  [invariantTechnicalLabels.cpu]: IconCpu,
  Memory: IconDeviceDesktopAnalytics,
  Pods: IconCube,
} satisfies Record<KubernetesCapacityType, React.ComponentType<{ size: number; stroke: number }>>;

interface ResourceIconProps {
  type: KubernetesCapacityType;
  size?: number;
  stroke?: number;
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({ type, size = 32, stroke = 1.5 }) => {
  const Icon = resourceIcons[type];
  return <Icon size={size} stroke={stroke} />;
};
