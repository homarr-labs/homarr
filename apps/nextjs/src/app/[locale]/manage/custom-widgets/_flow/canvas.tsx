"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import {
  Background,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  useNodesInitialized,
} from "@xyflow/react";
import type { Connection, OnConnectEnd } from "@xyflow/react";
import { useI18n } from "@homarr/translation/client";
import {
  useDeferredCustomWidgetFormDocumentValues,
  useCustomWidgetFormDocumentStore,
} from "../_custom-widget-form-state";
import { defaultEdgeOptions, initialFitOptions } from "./canvas-types";
import type { CanvasProps as Props } from "./canvas-types";
import { isPreviewInteraction, useCanvasEditorFocus } from "./canvas-editor-focus";
import { createFlowCommands, connectionIssue, isGraphEditable } from "./commands";
import { arrangeWidgetGraph, projectWidgetGraph } from "./graph";
import type { WidgetNode, WidgetEdge } from "./graph";
import { captureLayout, projectLayout, expandGroupSelection } from "./layout";
import { canvasNodeTypes } from "./canvas-preview";
import { useFlowConnection } from "./connection-provider";
import { CanvasControls, CanvasViewportControls } from "./canvas-controls";
import { useCanvasInteractions } from "./canvas-interactions";
import { AddNextStep } from "./add-next-step";
import type { PendingConnection } from "./add-next-step";
// oxlint-disable-next-line import/no-unassigned-import -- Canvas-only React Flow styles.
import "@xyflow/react/dist/style.css";
const Canvas = memo(function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
});
export default Canvas;
function CanvasContent({
  form,
  selected,
  selection,
  onSelect,
  onInspect,
  onSelection,
  onInit,
  inspectorOpened,
}: Props) {
  useCanvasEditorFocus(inspectorOpened, selected);
  const t = useI18n("customWidget.flow");
  const actions = useI18n("common.action");
  const store = useCustomWidgetFormDocumentStore();
  const values = useDeferredCustomWidgetFormDocumentValues();
  const graph = useMemo(() => projectWidgetGraph(values, store.getLayout()), [values, store]);
  const graphEditable = useMemo(() => isGraphEditable(values), [values]);
  const [nodes, setNodes] = useState<WidgetNode[]>(graph.nodes);
  const [issue, setIssue] = useState<string | null>(null);
  const [arranging, setArranging] = useState(false);
  const [branch, setBranch] = useState<string[] | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const initialized = useRef(false);
  const nodesInitialized = useNodesInitialized();
  const generation = useRef(0);
  const layoutJob = useRef(0);
  const reconnecting = useRef(false);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const { fitView, getNodes, screenToFlowPosition } = useReactFlow<WidgetNode, WidgetEdge>();
  const reducedMotion = useReducedMotion();
  const commands = useMemo(() => createFlowCommands(form, store), [form, store]);
  const connect = useFlowConnection();
  const { selectedEdge, ...interactions } = useCanvasInteractions({
    edges: graph.edges,
    selection,
    store,
    commands,
    getNodes,
    setNodes,
    onSelect,
    onInspect,
    onSelection,
    onIssue: setIssue,
  });
  useEffect(() => {
    generation.current += 1;
    setNodes((current) => {
      const measured = new Map(current.map((node) => [node.id, node]));
      return graph.nodes.map((node) => ({
        ...measured.get(node.id),
        ...node,
        selected: selectionRef.current.includes(node.id),
      }));
    });
  }, [graph]);
  useEffect(
    () =>
      store.subscribeEditor(() => {
        generation.current += 1;
        setNodes((current) => projectLayout(current, store.getLayout()));
      }),
    [store],
  );
  const arrange = useCallback(
    async (selectionOnly = false, initial = false) => {
      const token = ++generation.current;
      const job = ++layoutJob.current;
      setArranging(true);
      const revision = store.getRevision();
      try {
        let targets = getNodes();
        if (selectionOnly) targets = expandGroupSelection(targets, selectionRef.current);
        if (targets.length === 0) return;
        const arranged = await arrangeWidgetGraph(targets, graph.edges, selectionOnly);
        if (token !== generation.current || revision !== store.getRevision()) return;
        const current = store.getLayout();
        const next = {
          ...current,
          nodes: { ...current.nodes, ...arranged.nodes },
          groups: { ...current.groups, ...arranged.groups },
        };
        if (initial) {
          store.initializeLayout(next);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              void fitView({ duration: 0, maxZoom: 1 });
            }),
          );
        } else store.setLayout(next);
        setIssue(null);
      } catch {
        if (token === generation.current) {
          setIssue("layoutFailed");
        }
      } finally {
        if (job === layoutJob.current) setArranging(false);
      }
    },
    [getNodes, graph.edges, store, fitView],
  );
  useEffect(() => {
    if (initialized.current || !nodesInitialized) return;
    initialized.current = true;
    if (!Object.keys(store.getLayout().nodes).length) void arrange(false, true);
  }, [arrange, store, nodesInitialized]);
  const onConnect = useCallback(
    (connection: Connection) => setIssue(connect(connection, getNodes())),
    [connect, getNodes],
  );
  const isValidConnection = useCallback(
    (connection: Connection | WidgetEdge) => graphEditable && !connectionIssue(connection, getNodes()),
    [graphEditable, getNodes],
  );
  const endConnection: OnConnectEnd = (event, state) => {
    if (state.isValid || reconnecting.current || !state.fromNode) return;
    if (state.toNode) {
      setIssue("codeOwned");
      return;
    }
    const pointer = "changedTouches" in event ? event.changedTouches[0] : event;
    if (!pointer) return;
    const target = document.elementFromPoint(pointer.clientX, pointer.clientY);
    if (!target?.closest(".react-flow__pane")) return;
    setPending({
      nodeId: state.fromNode.id,
      handleType: state.fromHandle?.type ?? "source",
      position: screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY }),
    });
  };
  const focus = (related: boolean) => {
    const ids = new Set(selectionRef.current);
    if (related)
      for (const edge of graph.edges) {
        if (selectionRef.current.includes(edge.source)) ids.add(edge.target);
        if (selectionRef.current.includes(edge.target)) ids.add(edge.source);
      }
    for (const node of getNodes()) if (ids.has(node.id) && node.parentId) ids.add(node.parentId);
    if (related) setBranch([...ids]);
    void fitView({ nodes: [...ids].map((id) => ({ id })), maxZoom: 1.1, duration: reducedMotion ? 0 : 200 });
  };
  const displayedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        dragHandle: ".widget-node-drag",
        ariaLabel: `${t(`kind.${node.data.kind}`)}: ${node.data.label}`,
        hidden: !!branch && !branch.includes(node.id),
      })),
    [nodes, branch, t],
  );
  const displayedEdges = useMemo(() => {
    const labels = new Map(graph.nodes.map((node) => [node.id, node.data.label]));
    return graph.edges.map((edge) => {
      const related = edge.id === selectedEdge || edge.source === selected || edge.target === selected;
      return {
        ...edge,
        selected: edge.id === selectedEdge,
        markerEnd: { type: MarkerType.ArrowClosed, color: edge.style?.stroke?.toString(), width: 18, height: 18 },
        hidden: !!branch && (!branch.includes(edge.source) || !branch.includes(edge.target)),
        ariaLabel: `${t(`relationship.${edge.data?.relationship ?? "data"}`)}: ${labels.get(edge.source)} → ${labels.get(edge.target)}`,
        label: related ? t(`relationship.${edge.data?.relationship ?? "data"}`) : undefined,
        labelStyle: { fontSize: 10 },
        labelBgStyle: { fill: "var(--mantine-color-body)" },
        style: { ...edge.style, opacity: related || !selected ? 1 : 0.4 },
      };
    });
  }, [graph, selected, selectedEdge, branch, t]);
  return (
    <>
      <CanvasControls
        arranging={arranging}
        selection={selection}
        branch={!!branch}
        arrange={arrange}
        focus={focus}
        fit={() => {
          setBranch(null);
          requestAnimationFrame(() => {
            void fitView({ duration: reducedMotion ? 0 : 200 });
          });
        }}
      />
      {issue && (
        <Alert
          color="yellow"
          p="xs"
          withCloseButton
          closeButtonLabel={actions("close")}
          onClose={() => setIssue(null)}
          aria-live="polite"
        >
          {t(issue as "codeOwned")}
        </Alert>
      )}
      <ReactFlow<WidgetNode, WidgetEdge>
        onInit={onInit}
        nodes={displayedNodes}
        edges={displayedEdges}
        nodeTypes={canvasNodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        aria-label={t("canvas")}
        {...interactions}
        onConnect={onConnect}
        onConnectEnd={endConnection}
        onClickConnectEnd={endConnection}
        onReconnectStart={() => {
          reconnecting.current = true;
        }}
        onReconnect={(edge, connection) => setIssue(connect(connection, getNodes(), edge))}
        onReconnectEnd={() => {
          reconnecting.current = false;
        }}
        isValidConnection={isValidConnection}
        nodesConnectable={graphEditable}
        onNodeDoubleClick={(event, node) => {
          if (!isPreviewInteraction(event.target)) onSelect(node.id);
        }}
        onNodeDragStart={() => {
          generation.current += 1;
          setArranging(false);
        }}
        onNodeDragStop={() => store.setLayout(captureLayout(getNodes(), store.getLayout()))}
        onSelectionDragStart={() => {
          generation.current += 1;
          setArranging(false);
        }}
        onSelectionDragStop={() => store.setLayout(captureLayout(getNodes(), store.getLayout()))}
        panOnScroll
        selectionOnDrag
        panOnDrag={false}
        panActivationKeyCode="Space"
        selectionMode={SelectionMode.Partial}
        zoomOnScroll={false}
        zoomActivationKeyCode={["Control", "Meta"]}
        multiSelectionKeyCode={["Control", "Meta", "Shift"]}
        zoomOnDoubleClick={false}
        connectOnClick
        connectionRadius={24}
        reconnectRadius={18}
        nodesFocusable
        edgesFocusable
        autoPanOnNodeFocus
        disableKeyboardA11y={false}
        deleteKeyCode={null}
        minZoom={0.02}
        maxZoom={1.5}
        fitView
        fitViewOptions={initialFitOptions}
      >
        <Background gap={24} />
        <CanvasViewportControls />
      </ReactFlow>
      <AddNextStep pending={pending} form={form} onClose={() => setPending(null)} onSelect={onSelect} />
    </>
  );
}
