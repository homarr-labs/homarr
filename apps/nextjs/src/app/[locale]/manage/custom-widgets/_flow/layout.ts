import { createId } from "@homarr/common";
import type { CustomWidgetEditorLayout } from "@homarr/custom-widgets/core";
import type { WidgetNode } from "./graph";
import { absoluteNodePosition, nodeDimensions } from "./node-geometry";

export function captureLayout(nodes: WidgetNode[], previous: CustomWidgetEditorLayout): CustomWidgetEditorLayout {
  return {
    ...previous,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, { ...node.position, parentId: node.parentId }])),
    groups: Object.fromEntries(
      nodes
        .filter((node) => node.data.kind === "group")
        .map((node) => [
          node.id,
          {
            title: node.data.label,
            width: Number(node.style?.width ?? 600),
            height: Number(node.style?.height ?? 400),
          },
        ]),
    ),
  };
}

export function projectLayout(nodes: WidgetNode[], layout: CustomWidgetEditorLayout): WidgetNode[] {
  const previous = new Map(nodes.map((node) => [node.id, node]));
  const groups: WidgetNode[] = Object.entries(layout.groups).map(([id, group]) => {
    const stored = layout.nodes[id] ?? { x: 0, y: 0 };
    return {
      ...previous.get(id),
      id,
      type: "group",
      dragHandle: ".widget-node-drag",
      position: { x: stored.x, y: stored.y },
      style: { width: group.width, height: group.height },
      data: { kind: "group", identifier: id, label: group.title, summary: "" },
    };
  });
  return [
    ...groups,
    ...nodes
      .filter((node) => node.data.kind !== "group")
      .map((node) => {
        const stored = layout.nodes[node.id];
        if (!stored) return { ...node, parentId: undefined };
        let parentId: string | undefined;
        if (stored.parentId && layout.groups[stored.parentId]) parentId = stored.parentId;
        return { ...node, parentId, position: { x: stored.x, y: stored.y } };
      }),
  ];
}

export function absolutePosition(node: WidgetNode, nodes: WidgetNode[]) {
  return absoluteNodePosition(node, new Map(nodes.map((entry) => [entry.id, entry])));
}

export function groupNodes(nodes: WidgetNode[], title: string): WidgetNode[] {
  const selected = nodes.filter((node) => node.selected && node.data.kind !== "group");
  if (selected.length < 2) return nodes;
  const positions = selected.map((node) => absolutePosition(node, nodes));
  const dimensions = selected.map(nodeDimensions);
  const id = `group:${createId()}`;
  const x = Math.min(...positions.map((position) => position.x)) - 30;
  const y = Math.min(...positions.map((position) => position.y)) - 60;
  const width =
    Math.max(...positions.map((position, index) => position.x + (dimensions[index]?.width ?? 240))) - x + 30;
  const height =
    Math.max(...positions.map((position, index) => position.y + (dimensions[index]?.height ?? 140))) - y + 30;
  const ids = new Set(selected.map((node) => node.id));
  const result: WidgetNode[] = [
    {
      id,
      type: "group",
      dragHandle: ".widget-node-drag",
      position: { x, y },
      style: { width, height },
      data: {
        kind: "group",
        identifier: id,
        label: title,
        summary: "",
      },
      selected: true,
    },
    ...nodes.map((node) => {
      if (!ids.has(node.id)) return { ...node, selected: false };
      const position = absolutePosition(node, nodes);
      return { ...node, parentId: id, position: { x: position.x - x, y: position.y - y }, selected: false };
    }),
  ];
  return result;
}

export function ungroupNodes(nodes: WidgetNode[]): WidgetNode[] {
  const selected = nodes.filter((node) => node.selected);
  const ids = new Set(selected.filter((node) => node.data.kind === "group").map((node) => node.id));
  const members = new Set(selected.map((node) => node.id));
  return nodes
    .filter((node) => !ids.has(node.id))
    .map((node) => {
      if (!node.parentId || (!ids.has(node.parentId) && !members.has(node.id))) return node;
      return { ...node, parentId: undefined, position: absolutePosition(node, nodes), selected: true };
    });
}

export function expandGroupSelection(nodes: WidgetNode[], selection: string[]) {
  const ids = new Set(selection);
  return nodes.filter((node) => ids.has(node.id) || (node.parentId && ids.has(node.parentId)));
}
