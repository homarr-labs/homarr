import type { WidgetNode } from "./graph";

/** Measurements are editor state; defaults cover nodes before React Flow measures them. */
export function nodeDimensions(node: WidgetNode) {
  let fallback = { width: 240, height: 140 };
  if (node.data.kind === "widget") {
    // The widest preview is 720px; include its border, status, header and stale-state text.
    fallback = { width: 722, height: 520 };
  }
  if (node.data.kind === "group") fallback = { width: 600, height: 400 };
  return {
    width: dimension(node.measured?.width) ?? dimension(node.width) ?? dimension(node.style?.width) ?? fallback.width,
    height:
      dimension(node.measured?.height) ?? dimension(node.height) ?? dimension(node.style?.height) ?? fallback.height,
  };
}

function dimension(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

export function absoluteNodePosition(node: WidgetNode | undefined, nodes: ReadonlyMap<string, WidgetNode>) {
  const position = { x: 0, y: 0 };
  const visited = new Set<string>();
  while (node && !visited.has(node.id)) {
    visited.add(node.id);
    position.x += node.position.x;
    position.y += node.position.y;
    node = nodes.get(node.parentId ?? "");
  }
  return position;
}
