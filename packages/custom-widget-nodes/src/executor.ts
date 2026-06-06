import type { FlowGraph, FlowNode } from "./types";
import { getNodeType } from "./registry";

const topologicalSort = (graph: FlowGraph): string[] => {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    const current = inDegree.get(edge.target) ?? 0;
    inDegree.set(edge.target, current + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== graph.nodes.length) {
    throw new Error("Flow graph contains a cycle");
  }

  return sorted;
};

const collectInputs = (nodeId: string, graph: FlowGraph, outputs: Map<string, unknown>): Record<string, unknown> => {
  const inputs: Record<string, unknown> = {};
  for (const edge of graph.edges) {
    if (edge.target !== nodeId) continue;
    const handleId = edge.targetHandle ?? "default";
    inputs[handleId] = outputs.get(`${edge.source}:${edge.sourceHandle ?? "default"}`);
  }
  return inputs;
};

export const executeFlowGraph = async (
  graph: FlowGraph,
  secrets: Record<string, string> = {},
): Promise<Record<string, unknown>> => {
  const sortedIds = topologicalSort(graph);
  const nodeMap = new Map<string, FlowNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  const outputs = new Map<string, unknown>();
  const displayResults: Record<string, unknown> = {};

  const sourceNodes = sortedIds.filter((id) => {
    const node = nodeMap.get(id)!;
    const def = getNodeType(node.type);
    return def?.category === "source";
  });

  const nonSourceNodes = sortedIds.filter((id) => !sourceNodes.includes(id));

  await Promise.all(
    sourceNodes.map(async (id) => {
      const node = nodeMap.get(id)!;
      const def = getNodeType(node.type);
      if (!def) return;

      const inputs = collectInputs(id, graph, outputs);
      inputs._secrets = secrets;

      const result = await def.execute(node.data, inputs);
      const outputHandle = def.outputs[0]?.id ?? "default";
      outputs.set(`${id}:${outputHandle}`, result);
    }),
  );

  for (const id of nonSourceNodes) {
    const node = nodeMap.get(id)!;
    const def = getNodeType(node.type);
    if (!def) continue;

    const inputs = collectInputs(id, graph, outputs);
    const result = await def.execute(node.data, inputs);

    if (def.category === "display") {
      displayResults[id] = result;
    } else {
      const outputHandle = def.outputs[0]?.id ?? "default";
      outputs.set(`${id}:${outputHandle}`, result);
    }
  }

  return displayResults;
};
