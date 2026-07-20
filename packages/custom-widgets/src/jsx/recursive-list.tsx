import type { ErrorInfo, ReactNode } from "react";
import { Component, useMemo } from "react";
import { Box, Group, Text, Tree, useTree } from "@mantine/core";
import type { MantineSpacing, RenderTreeNodePayload, TreeNodeData } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import { buildTrustedRecursiveList } from "./recursive-list-builder";
import type { TrustedRecursiveListProps } from "./recursive-list-types";

const HARD_MAX_DEPTH = 32;

export { buildTrustedRecursiveList };
export type {
  RecursiveListBuildOptions,
  RecursiveListMetadata,
  TrustedRecursiveListProps,
} from "./recursive-list-types";

export function TrustedRecursiveList({ ...props }: TrustedRecursiveListProps) {
  return (
    <RecursiveListErrorBoundary resetKey={props.nodes} code="RECURSIVE_LIST_RENDER_ERROR">
      <TrustedRecursiveListInner {...props} />
    </RecursiveListErrorBoundary>
  );
}

function TrustedRecursiveListInner({
  nodes,
  defaultExpandedDepth = 4,
  indent = "lg",
  gap = "xs",
  showLines = false,
  rootProps = {},
}: TrustedRecursiveListProps) {
  const initialExpandedState = useMemo(
    () => collectInitialExpandedState(nodes, clampInteger(defaultExpandedDepth, 0, HARD_MAX_DEPTH, 4)),
    [defaultExpandedDepth, nodes],
  );
  const tree = useTree({ initialExpandedState });

  return (
    <Tree
      {...rootProps}
      data={nodes}
      tree={tree}
      levelOffset={indent}
      withLines={showLines}
      renderNode={(payload) => <TrustedRecursiveListNode {...payload} gap={gap} />}
    />
  );
}

class RecursiveListErrorBoundary extends Component<
  { children: ReactNode; resetKey: unknown; code: string },
  { error: Error | null; resetKey: unknown }
> {
  public state = { error: null, resetKey: this.props.resetKey } as { error: Error | null; resetKey: unknown };
  public static getDerivedStateFromProps(
    props: Readonly<{ children: ReactNode; resetKey: unknown; code: string }>,
    state: Readonly<{ error: Error | null; resetKey: unknown }>,
  ) {
    if (props.resetKey === state.resetKey) return null;
    return { error: null, resetKey: props.resetKey };
  }
  public static getDerivedStateFromError(error: Error) {
    return { error };
  }
  public componentDidCatch(_error: Error, _info: ErrorInfo) {}
  public render() {
    return this.state.error ? (
      <Text size="xs" c="red">
        {this.props.code}: {this.state.error.message}
      </Text>
    ) : (
      this.props.children
    );
  }
}

function TrustedRecursiveListNode({
  node,
  expanded,
  hasChildren,
  elementProps,
  gap,
}: RenderTreeNodePayload & { gap: MantineSpacing }) {
  return (
    <Group {...elementProps} aria-expanded={hasChildren ? expanded : undefined} gap={gap} wrap="nowrap" py={2}>
      <Box w={16} h={16} style={{ flex: "0 0 16px" }} aria-hidden>
        {hasChildren && (
          <IconChevronRight
            size={15}
            style={{ transform: expanded ? "rotate(90deg)" : undefined, transition: "transform 120ms ease" }}
          />
        )}
      </Box>
      <Box style={{ minWidth: 0, flex: 1 }}>
        <RecursiveListErrorBoundary resetKey={node.label} code="RECURSIVE_LIST_BRANCH_RENDER_ERROR">
          {node.label}
        </RecursiveListErrorBoundary>
      </Box>
    </Group>
  );
}

function collectInitialExpandedState(nodes: readonly TreeNodeData[], depthLimit: number) {
  const expanded: Record<string, boolean> = {};
  const visit = (values: readonly TreeNodeData[], depth: number) => {
    for (const node of values) {
      if (!node.children?.length || depth >= depthLimit) continue;
      expanded[node.value] = true;
      visit(node.children, depth + 1);
    }
  };
  visit(nodes, 0);
  return expanded;
}

function clampInteger(value: number, minimum: number, maximum: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}
