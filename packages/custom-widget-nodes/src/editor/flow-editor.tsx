"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import type { Connection, Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, Group, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconPlayerPlay } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { FlowGraph, FlowNode, FlowEdge } from "../types";
import { SourceNode } from "./node-components/source-node";
import { TransformNode } from "./node-components/transform-node";
import { DisplayNode } from "./node-components/display-node";
import { FlowContextMenu } from "./context-menu";
import { ConfigPanel } from "./config-panel";

const nodeTypes = {
  httpRequest: SourceNode,
  jsonPath: TransformNode,
  merge: TransformNode,
  template: TransformNode,
  singleValue: DisplayNode,
  keyValue: DisplayNode,
  table: DisplayNode,
  lineChart: DisplayNode,
  areaChart: DisplayNode,
  barChart: DisplayNode,
  sparkline: DisplayNode,
};

const categoryForType: Record<string, string> = {
  httpRequest: "source",
  jsonPath: "transform",
  merge: "transform",
  template: "transform",
  singleValue: "display",
  keyValue: "display",
  table: "display",
  lineChart: "display",
  areaChart: "display",
  barChart: "display",
  sparkline: "display",
};

interface FlowEditorProps {
  initialGraph?: FlowGraph;
  onSave: (graph: FlowGraph) => void;
  onTest?: () => void;
  isSaving?: boolean;
}

let nodeIdCounter = 0;
const generateNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

const convertToReactFlowNodes = (flowNodes: FlowNode[]): Node[] =>
  flowNodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n.data, label: n.data.label ?? n.type },
  }));

const convertToReactFlowEdges = (flowEdges: FlowEdge[]): Edge[] =>
  flowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
  }));

export function FlowEditor({ initialGraph, onSave, onTest, isSaving }: FlowEditorProps) {
  const t = useScopedI18n("customWidget.flowEditor");
  const initialNodes = initialGraph ? convertToReactFlowNodes(initialGraph.nodes) : [];
  const initialEdges = initialGraph ? convertToReactFlowEdges(initialGraph.edges) : [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode({
      id: node.id,
      type: node.type ?? "unknown",
      position: node.position,
      data: node.data as Record<string, unknown>,
    });
    setConfigOpen(true);
  }, []);

  const handleAddNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: generateNodeId(),
        type,
        position,
        data: { label: type },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges],
  );

  const handleSave = useCallback(() => {
    const graph: FlowGraph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type ?? "unknown",
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      })),
    };
    onSave(graph);
  }, [nodes, edges, onSave]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <Stack h="100%" gap={0}>
      <Group p="sm" justify="end" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        {onTest && (
          <Button variant="light" leftSection={<IconPlayerPlay size={14} />} onClick={onTest} size="sm">
            {t("test")}
          </Button>
        )}
        <Button leftSection={<IconDeviceFloppy size={14} />} onClick={handleSave} loading={isSaving} size="sm">
          {t("save")}
        </Button>
      </Group>
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onContextMenu={onPaneContextMenu}
          onNodeClick={onNodeClick}
          nodeTypes={memoizedNodeTypes}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>

        {contextMenu && (
          <FlowContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onAddNode={handleAddNode}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      <ConfigPanel
        node={selectedNode}
        opened={configOpen}
        onClose={() => setConfigOpen(false)}
        onUpdate={handleUpdateNode}
        onDelete={handleDeleteNode}
      />
    </Stack>
  );
}
