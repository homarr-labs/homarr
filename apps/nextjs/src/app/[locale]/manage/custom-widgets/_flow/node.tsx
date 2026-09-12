"use client";
import { memo, useEffect } from "react";
import { Badge, Group, Text } from "@mantine/core";
import { Handle, Position, useStore, useUpdateNodeInternals } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  IconApi,
  IconBraces,
  IconCode,
  IconDatabase,
  IconPlayerPlay,
  IconFolder,
  IconPlug,
  IconAdjustments,
  IconNotes,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import type { WidgetNode } from "./graph";
import { connectionIssue } from "./commands";
import classes from "./workbench.module.css";
import portClasses from "./node-port.module.css";
import { FlowExecutionStatus } from "./execution";
const icons = {
  source: IconApi,
  query: IconDatabase,
  action: IconPlayerPlay,
  options: IconBraces,
  widget: IconCode,
  group: IconFolder,
  native: IconPlug,
  fragment: IconLayoutGrid,
  preference: IconAdjustments,
  content: IconNotes,
};
const colors = {
  source: "blue",
  query: "teal",
  action: "orange",
  options: "gray",
  widget: "red",
  group: "gray",
  native: "cyan",
  fragment: "pink",
  preference: "yellow",
  content: "cyan",
};
export function useValidConnectionTarget(id: string, isConnectable: boolean) {
  return useStore((state) => {
    let from = state.connection.fromNode;
    if (!from && state.connectionClickStartHandle) {
      from = state.nodeLookup.get(state.connectionClickStartHandle.nodeId) ?? null;
    }
    const node = state.nodeLookup.get(id);
    if (!isConnectable || !from || !node || from.id === id) return false;
    let source = from.id;
    let target = id;
    const handleType = state.connection.fromHandle?.type ?? state.connectionClickStartHandle?.type;
    if (handleType === "target") {
      source = id;
      target = from.id;
    }
    return !connectionIssue({ source, target }, [from.internals.userNode, node.internals.userNode] as WidgetNode[]);
  });
}
export const FlowNode = memo(function FlowNode({ id, data, selected, isConnectable }: NodeProps<WidgetNode>) {
  const t = useI18n("customWidget.flow");
  const compact = useStore((state) => state.transform[2] < 0.65);
  const validTarget = useValidConnectionTarget(id, isConnectable);
  const updateInternals = useUpdateNodeInternals();
  useEffect(() => updateInternals(id), [compact, id, updateInternals]);
  const Icon = icons[data.kind];
  return (
    <div className={classes.node} data-selected={selected} data-kind={data.kind} data-valid-target={validTarget}>
      <FlowPort
        id="in"
        type="target"
        position={Position.Left}
        connectable={isConnectable}
        label={`${t("input")} · ${data.label}`}
        title={t("input")}
      />
      <Group className="widget-node-drag" gap="xs" wrap="nowrap" p="sm">
        <Icon size={18} color={`var(--mantine-color-${colors[data.kind]}-6)`} />
        <Text size="sm" fw={600} truncate>
          {data.label}
        </Text>
      </Group>
      {!compact && (
        <div className={classes.nodeDetails}>
          <Badge size="xs" variant="light" color={colors[data.kind]}>
            {t(`kind.${data.kind}`)}
          </Badge>
          {["query", "action", "native"].includes(data.kind) && <FlowExecutionStatus requestId={data.identifier} />}
          <Text size="xs" c="dimmed" truncate mt={6}>
            {data.summary}
          </Text>
        </div>
      )}
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

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- React Flow requires its Handle div for measured connection anchors. */
export function FlowPort({
  connectable,
  label,
  ...props
}: {
  id: string;
  type: "source" | "target";
  position: Position;
  connectable: boolean;
  label: string;
  title: string;
}) {
  let tabIndex = -1;
  if (connectable) tabIndex = 0;
  return (
    <Handle
      {...props}
      className={portClasses.handle}
      isConnectable={connectable}
      role="button"
      tabIndex={tabIndex}
      aria-disabled={!connectable}
      aria-label={label}
      onKeyDown={(event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (connectable && !event.repeat) event.currentTarget.click();
      }}
      onKeyUp={(event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    />
  );
}
/* oxlint-enable jsx-a11y/prefer-tag-over-role */
