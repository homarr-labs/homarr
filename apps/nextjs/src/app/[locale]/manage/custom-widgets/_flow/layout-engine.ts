import type { ElkNode } from "elkjs/lib/elk-api";
import type { CustomWidgetEditorLayout } from "@homarr/custom-widgets/core";
import type { WidgetNode, WidgetEdge } from "./graph";

/** Only editor code loads this module; ELK runs in a real worker. */
export async function arrangeWidgetGraph(nodes: WidgetNode[], edges: WidgetEdge[], preserveAnchor = false) {
  const { default: ELK } = await import("elkjs/lib/elk-api");
  const worker = new Worker(new URL("elkjs/lib/elk-worker.min.js", import.meta.url));
  const elk = new ELK({ workerFactory: () => worker });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Layout timed out")), 15_000);
  });
  try {
    const ids = new Set(nodes.map((node) => node.id));
    const rootMembers = nodes.filter((node) => !node.parentId || !ids.has(node.parentId));
    const options = {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    };
    const buildNode = (node: WidgetNode): ElkNode => {
      if (node.data.kind === "group")
        return {
          id: node.id,
          layoutOptions: {
            ...options,
            "elk.padding": "[top=60,left=30,bottom=30,right=30]",
          },
          children: nodes.filter((member) => member.parentId === node.id).map(buildNode),
        };
      return {
        id: node.id,
        width: 240,
        height: 120,
        layoutOptions: { "elk.portConstraints": "FIXED_SIDE" },
        ports: [
          { id: `${node.id}:in`, layoutOptions: { "elk.port.side": "WEST" } },
          { id: `${node.id}:out`, layoutOptions: { "elk.port.side": "EAST" } },
        ],
      };
    };
    const result = await Promise.race([
      deadline,
      elk.layout({
        id: "root",
        layoutOptions: options,
        children: rootMembers.map(buildNode),
        edges: edges
          .filter(
            (edge) =>
              ids.has(edge.source) &&
              ids.has(edge.target) &&
              edge.data?.relationship !== "invalidates" &&
              edge.data?.relationship !== "invoke",
          )
          .map((edge) => ({ id: edge.id, sources: [`${edge.source}:out`], targets: [`${edge.target}:in`] })),
      }),
    ]);
    const next: Pick<CustomWidgetEditorLayout, "nodes" | "groups"> = { nodes: {}, groups: {} };
    const original = new Map(nodes.map((node) => [node.id, node]));
    // Arranging a selection preserves its location and every unrelated position.
    const x = Math.min(0, ...rootMembers.map((node) => node.position.x));
    const y = Math.min(0, ...rootMembers.map((node) => node.position.y));
    let offsetX = 0;
    let offsetY = 0;
    if (preserveAnchor && rootMembers.length) {
      offsetX =
        Math.min(...rootMembers.map((node) => node.position.x)) -
        Math.min(...(result.children ?? []).map((node) => node.x ?? 0));
      offsetY =
        Math.min(...rootMembers.map((node) => node.position.y)) -
        Math.min(...(result.children ?? []).map((node) => node.y ?? 0));
    } else {
      offsetX = x;
      offsetY = y;
    }
    const collect = (members: ElkNode[], topLevel: boolean) => {
      for (const member of members) {
        const previous = original.get(member.id);
        if (!previous) continue;
        let memberX = member.x ?? 0;
        let memberY = member.y ?? 0;
        if (topLevel) {
          memberX += offsetX;
          memberY += offsetY;
        }
        next.nodes[member.id] = { x: memberX, y: memberY, parentId: previous.parentId };
        if (previous.data.kind === "group") {
          next.groups[member.id] = {
            title: previous.data.label,
            width: Math.max(240, member.width ?? 240),
            height: Math.max(160, member.height ?? 160),
          };
        }
        collect(member.children ?? [], false);
      }
    };
    collect(result.children ?? [], true);
    return next;
  } finally {
    clearTimeout(timeout);
    worker.terminate();
  }
}
