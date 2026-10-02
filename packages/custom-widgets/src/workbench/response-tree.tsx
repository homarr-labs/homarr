"use client";

import { useMemo } from "react";
import { ActionIcon, Code, CopyButton, Group, Text, Tree, getTreeExpandedState, useTree } from "@mantine/core";
import type { RenderTreeNodePayload, TreeNodeData } from "@mantine/core";
import { IconCheck, IconChevronDown, IconChevronRight, IconCopy, IconPlus } from "@tabler/icons-react";

export interface ResponseTreeLabels {
  copyPath: string;
  pathCopied: string;
  insertPath: string;
}
export interface ResponseTreeProps {
  value: unknown;
  labels: ResponseTreeLabels;
  onInsertDataPath?: (path: string) => void;
}

interface ResponseTreeData extends TreeNodeData {
  path: string;
  displayValue: string;
}

export function ResponseTree({ value, labels, onInsertDataPath }: ResponseTreeProps) {
  const data = useMemo(() => [createResponseTreeNode(value, "data", "data")], [value]);
  const tree = useTree({ initialExpandedState: getTreeExpandedState(data, ["data"]) });
  return (
    <Tree
      data={data}
      tree={tree}
      levelOffset={14}
      expandOnClick
      selectOnClick={false}
      renderNode={(payload) => <ResponseTreeNode {...payload} labels={labels} onInsertDataPath={onInsertDataPath} />}
    />
  );
}

function ResponseTreeNode({
  node,
  expanded,
  hasChildren,
  elementProps,
  labels,
  onInsertDataPath,
}: RenderTreeNodePayload & { labels: ResponseTreeLabels; onInsertDataPath?: (path: string) => void }) {
  const responseNode = node as ResponseTreeData;
  return (
    <Group {...elementProps} gap={4} wrap="nowrap" mih={28} className="response-tree-row">
      <div style={{ width: 16, flexShrink: 0 }}>
        {hasChildren && (expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />)}
      </div>
      <Code style={{ flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis", fontSize: 11 }}>
        {responseNode.label}
      </Code>
      <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
        {responseNode.displayValue}
      </Text>
      <Group gap={2} wrap="nowrap" className="response-tree-actions">
        <CopyButton value={responseNode.path}>
          {({ copied, copy }) => (
            <ActionIcon
              type="button"
              variant="subtle"
              color={copied ? "green" : "gray"}
              size={24}
              aria-label={copied ? labels.pathCopied : labels.copyPath}
              onClick={(event) => {
                event.stopPropagation();
                copy();
              }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          )}
        </CopyButton>
        {onInsertDataPath && (
          <ActionIcon
            type="button"
            variant="subtle"
            size={24}
            aria-label={labels.insertPath}
            onClick={(event) => {
              event.stopPropagation();
              onInsertDataPath(responseNode.path);
            }}
          >
            <IconPlus size={14} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  );
}

export function createResponseTreeNode(value: unknown, path: string, label: string): ResponseTreeData {
  const collection = value !== null && typeof value === "object";
  const entries = collection ? Object.entries(value as Record<string, unknown>) : [];
  return {
    value: path,
    label,
    path,
    displayValue: collection
      ? Array.isArray(value)
        ? `[${entries.length}]`
        : `{${entries.length}}`
      : formatValue(value),
    children: entries.map(([key, child]) =>
      createResponseTreeNode(child, appendDataPath(path, key, Array.isArray(value)), key),
    ),
  };
}

export function appendDataPath(parent: string, key: string, isArray: boolean): string {
  if (isArray) return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/u.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  return String(value);
}
