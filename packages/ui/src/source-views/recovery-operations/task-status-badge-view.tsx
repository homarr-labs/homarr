"use client";

import { Badge } from "@mantine/core";

import type { TaskStatusBadgeViewProps } from "./contracts";

export const TaskStatusBadgeView = ({
  isEnabled,
  status,
  disabledLabel,
  runningLabel,
  idleLabel,
}: TaskStatusBadgeViewProps) => {
  if (!isEnabled) {
    return (
      <Badge color="yellow" size="sm">
        {disabledLabel}
      </Badge>
    );
  }

  if (!status) return null;

  if (status === "running") {
    return (
      <Badge color="green" size="sm">
        {runningLabel}
      </Badge>
    );
  }

  return (
    <Badge variant="default" size="sm">
      {idleLabel}
    </Badge>
  );
};
