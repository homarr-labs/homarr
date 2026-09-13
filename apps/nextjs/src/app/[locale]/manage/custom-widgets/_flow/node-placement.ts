import type { WidgetNode } from "./graph";
import { absoluteNodePosition, nodeDimensions } from "./node-geometry";

interface Position {
  x: number;
  y: number;
}
interface Bounds extends Position {
  width: number;
  height: number;
}
const gap = 32;
const coordinateLimit = 100_000;

/** Position only newly created nodes, near a selected branch or an explicit canvas drop. */
export function placeAddedNodes(
  previous: WidgetNode[],
  nodes: WidgetNode[],
  primaryId: string,
  origin: string | Position,
): Record<string, Position> {
  const previousIds = new Set(previous.map((node) => node.id));
  const added = nodes.filter((node) => !previousIds.has(node.id));
  const primary = added.find((node) => node.id === primaryId);
  if (!primary) return {};
  const previousNodes = new Map(previous.map((node) => [node.id, node]));
  const current = nodes.map((node) => ({
    ...previousNodes.get(node.id),
    ...node,
    measured: node.measured ?? previousNodes.get(node.id)?.measured,
  }));
  const lookup = new Map(current.map((node) => [node.id, node]));
  let preferred: Position;
  if (typeof origin === "string") {
    const anchor = absoluteNodePosition(lookup.get(origin), lookup);
    preferred = { x: anchor.x + 300, y: anchor.y + 40 };
  } else preferred = origin;
  const occupied = current.filter((node) => previousIds.has(node.id)).map((node) => bounds(node, lookup));
  const positions: Record<string, Position> = {};
  const ordered = [primary, ...added.filter((node) => node.id !== primaryId)];
  for (const node of ordered) {
    let candidate = preferred;
    if (node.id !== primaryId) {
      const placed = positions[primaryId] ?? candidate;
      candidate = { x: placed.x - 300, y: placed.y };
    }
    const dimensions = bounds(node, lookup);
    const position = findFreePosition(candidate, dimensions, occupied);
    positions[node.id] = position;
    occupied.push({ ...dimensions, ...position });
  }
  return positions;
}

function bounds(node: WidgetNode, nodes: Map<string, WidgetNode>): Bounds {
  return { ...absoluteNodePosition(node, nodes), ...nodeDimensions(node) };
}

function findFreePosition(preferred: Position, size: Bounds, occupied: Bounds[]): Position {
  const clamp = (value: number) => Math.max(-coordinateLimit, Math.min(coordinateLimit, value));
  const xs = [clamp(preferred.x), ...occupied.flatMap((box) => [box.x - size.width - gap, box.x + box.width + gap])];
  const ys = [clamp(preferred.y), ...occupied.flatMap((box) => [box.y - size.height - gap, box.y + box.height + gap])];
  ys.sort((left, right) => Math.abs(left - preferred.y) - Math.abs(right - preferred.y));
  // Keep the branch's column when possible; boundary candidates also handle densely packed groups.
  for (const x of new Set(xs)) {
    if (Math.abs(x) > coordinateLimit) continue;
    for (const y of new Set(ys)) {
      if (Math.abs(y) > coordinateLimit) continue;
      const overlaps = occupied.some(
        (box) =>
          x < box.x + box.width + gap &&
          x + size.width + gap > box.x &&
          y < box.y + box.height + gap &&
          y + size.height + gap > box.y,
      );
      if (!overlaps) return { x, y };
    }
  }
  return { x: clamp(preferred.x), y: clamp(preferred.y) };
}
