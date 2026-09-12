"use client";
import { createContext, memo, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { Button, Group, Text } from "@mantine/core";
import { Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { IconCode } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import type { WidgetNode } from "./graph";
import { FlowNode, FlowPort, useValidConnectionTarget } from "./node";
import { FlowGroup } from "./group";
import { WorkbenchPreviewTheme } from "./preview-theme";
import { WorkbenchPreviewPresentationProvider } from "./preview-presentation";
import classes from "./workbench.module.css";

const CanvasPreviewContext = createContext<{ preview: ReactNode; edit(id: string): void } | null>(null);
export function CanvasPreviewProvider({
  preview,
  edit,
  children,
}: {
  preview: ReactNode;
  edit(id: string): void;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ preview, edit }), [preview, edit]);
  return <CanvasPreviewContext.Provider value={value}>{children}</CanvasPreviewContext.Provider>;
}

export const CanvasWidgetNode = memo(function CanvasWidgetNode({
  id,
  data,
  selected,
  isConnectable,
}: NodeProps<WidgetNode>) {
  const context = useContext(CanvasPreviewContext);
  const t = useI18n("customWidget.flow");
  const validTarget = useValidConnectionTarget(id, isConnectable);
  return (
    <div className={classes.canvasWidgetNode} data-selected={selected} data-valid-target={validTarget}>
      <FlowPort
        id="in"
        type="target"
        position={Position.Left}
        connectable={isConnectable}
        label={`${t("input")} · ${data.label}`}
        title={t("input")}
      />
      <Group className="widget-node-drag" justify="space-between" wrap="nowrap" p="sm">
        <Text size="sm" fw={600} truncate>
          {data.label}
        </Text>
        <Button
          className="nodrag nopan"
          type="button"
          variant="default"
          size="compact-xs"
          leftSection={<IconCode size={14} />}
          onClick={() => context?.edit(id)}
        >
          {t("editJsx")}
        </Button>
      </Group>
      <div className="nodrag nopan nowheel" data-flow-preview>
        <WorkbenchPreviewTheme controls={false}>
          <WorkbenchPreviewPresentationProvider mode="canvas">{context?.preview}</WorkbenchPreviewPresentationProvider>
        </WorkbenchPreviewTheme>
      </div>
      <FlowPort
        id="out"
        type="source"
        position={Position.Right}
        connectable={isConnectable}
        label={`${t("output")} · ${data.label}`}
        title={t("output")}
      />
    </div>
  );
});
export const canvasNodeTypes = { widget: FlowNode, preview: CanvasWidgetNode, group: FlowGroup };
