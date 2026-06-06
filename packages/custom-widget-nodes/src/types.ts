import type { z } from "zod/v4";

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeCategory = "source" | "transform" | "display";

export interface HandleDefinition {
  id: string;
  label: string;
}

export interface NodeTypeDefinition<TData = Record<string, unknown>> {
  type: string;
  category: NodeCategory;
  label: string;
  schema: z.ZodType<TData>;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  execute: (data: TData, inputs: Record<string, unknown>) => Promise<unknown>;
}

export interface ExecutionContext {
  secrets: Array<{ kind: string; value: string }>;
  baseUrl?: string;
  authType?: string;
  headerName?: string;
}
