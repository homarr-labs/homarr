"use client";
import { memo } from "react";
import { Text } from "@mantine/core";
import type { NodeProps } from "@xyflow/react";
import type { WidgetNode } from "./graph";
import classes from "./workbench.module.css";

export const FlowGroup = memo(function FlowGroup({ data, selected }: NodeProps<WidgetNode>) {
  return (
    <div className={classes.group} data-selected={selected}>
      <Text className="widget-node-drag" fw={600} size="sm">
        {data.label}
      </Text>
    </div>
  );
});
