import type { ReactNode } from "react";
import type { MantineSpacing, TreeNodeData } from "@mantine/core";

import type { Budget } from "./interpreter-foundation";

export interface RecursiveListMetadata {
  depth: number;
  index: number;
  path: number[];
  key: string;
  hasChildren: boolean;
  childCount: number;
  isLast: boolean;
}

export interface RecursiveListBuildOptions {
  data: unknown;
  childrenPath: string;
  keyPath: string;
  maxDepth?: unknown;
  maxNodes?: unknown;
  budget: Budget;
  warnings: Set<string>;
  render(node: unknown, metadata: RecursiveListMetadata, depth: number): ReactNode;
}

export interface TrustedRecursiveListProps {
  nodes: TreeNodeData[];
  defaultExpandedDepth?: number;
  indent?: MantineSpacing;
  gap?: MantineSpacing;
  showLines?: boolean;
  rootProps?: Record<string, unknown>;
}
