import React from "react";
import IconCpu from "@tabler/icons-react/icons/IconCpu";
import IconCube from "@tabler/icons-react/icons/IconCube";
import IconDeviceDesktopAnalytics from "@tabler/icons-react/icons/IconDeviceDesktopAnalytics";

import type { KubernetesCapacityType } from "@homarr/definitions";

const resourceIcons = {
  CPU: IconCpu,
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
