"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { applyNodeChanges } from "@xyflow/react";
import type { AriaLabelConfig, EdgeChange, NodeChange, NodeMouseHandler, EdgeMouseHandler } from "@xyflow/react";
import { useI18n } from "@homarr/translation/client";
import type { CustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { createFlowCommands } from "./commands";
import type { WidgetEdge, WidgetNode } from "./graph";
import { captureLayout } from "./layout";
import { isPreviewInteraction } from "./canvas-editor-focus";

interface Props {
  edges: WidgetEdge[];
  selection: string[];
  store: CustomWidgetFormDocumentStore;
  commands: ReturnType<typeof createFlowCommands>;
  getNodes(): WidgetNode[];
  setNodes: Dispatch<SetStateAction<WidgetNode[]>>;
  onSelect(id: string): void;
  onInspect(id: string): void;
  onSelection(ids: string[]): void;
  onIssue(issue: string | null): void;
}

/** Owns canvas selection and keyboard commands without putting transient selection into document history. */
export function useCanvasInteractions({
  edges,
  selection,
  store,
  commands,
  getNodes,
  setNodes,
  onSelect,
  onInspect,
  onSelection,
  onIssue,
}: Props) {
  const t = useI18n("customWidget.flow");
  const ariaLabelConfig = useMemo<Partial<AriaLabelConfig>>(
    () => ({
      "controls.zoomIn.ariaLabel": t("zoomIn"),
      "controls.zoomOut.ariaLabel": t("zoomOut"),
      "controls.fitView.ariaLabel": t("fit"),
      "controls.ariaLabel": t("canvasControls"),
      "handle.ariaLabel": t("connect"),
      "node.a11yDescription.default": t("nodeKeyboardHelp"),
      "node.a11yDescription.keyboardDisabled": t("nodePointerHelp"),
      "node.a11yDescription.ariaLiveMessage": ({ x, y }) => t("nodeMoved", { x, y }),
      "edge.a11yDescription.default": t("edgeKeyboardHelp"),
    }),
    [t],
  );
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const next = selection.includes(node.id);
        if (node.selected === next) return node;
        return { ...node, selected: next };
      }),
    );
  }, [selection, setNodes]);
  const onNodesChange = useCallback(
    (changes: NodeChange<WidgetNode>[]) => {
      setNodes((current) =>
        applyNodeChanges(
          changes.filter((change) => change.type !== "remove"),
          current,
        ),
      );
      const selectionChanges = changes.filter((change) => change.type === "select");
      if (selectionChanges.length === 0) return;
      const ids = new Set(selectionRef.current);
      for (const change of selectionChanges) {
        if (change.selected) ids.add(change.id);
        else ids.delete(change.id);
      }
      onSelection([...ids]);
    },
    [onSelection, setNodes],
  );
  const onEdgesChange = useCallback((changes: EdgeChange<WidgetEdge>[]) => {
    setSelectedEdge((current) => {
      let next = current;
      for (const change of changes) {
        if (change.type !== "select") continue;
        if (change.selected) next = change.id;
        else if (next === change.id) next = null;
      }
      return next;
    });
  }, []);
  const inspectEdge = useCallback(
    (edge: WidgetEdge) => {
      let id = edge.target;
      if (edge.data?.relationship === "invalidates") id = edge.source;
      setSelectedEdge(edge.id);
      onSelection([]);
      onInspect(id);
    },
    [onInspect, onSelection],
  );
  const onNodeClick: NodeMouseHandler<WidgetNode> = useCallback(
    (event, node) => {
      if (isPreviewInteraction(event.target)) return;
      setSelectedEdge(null);
      onInspect(node.id);
    },
    [onInspect],
  );
  const onEdgeClick: EdgeMouseHandler<WidgetEdge> = useCallback((_event, edge) => inspectEdge(edge), [inspectEdge]);
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!["Delete", "Backspace"].includes(event.key) || !(event.target instanceof Element)) return;
      const edgeId = event.target.closest(".react-flow__edge")?.getAttribute("data-id");
      const edge = edges.find((entry) => entry.id === edgeId);
      if (!edge) return;
      // A focused edge owns Delete; never forward it to the workbench's previous node selection.
      event.preventDefault();
      event.stopPropagation();
      onSelection([]);
      const result = commands.disconnect(edge);
      onIssue(result);
      if (!result) {
        setSelectedEdge(null);
        // The removed SVG cannot retain focus. Keep Undo and subsequent keyboard commands inside the workbench.
        event.currentTarget
          .querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(edge.source)}"]`)
          ?.focus({ preventScroll: true });
      }
    },
    [commands, edges, onIssue, onSelection],
  );
  const onKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (isPreviewInteraction(event.target)) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('input, textarea, button, [contenteditable="true"], [role="combobox"]')) return;
      const nodeId = event.target.closest(".react-flow__node")?.getAttribute("data-id");
      if (nodeId && event.key === "F2") {
        event.preventDefault();
        onSelect(nodeId);
        return;
      }
      if (["Enter", " "].includes(event.key)) {
        if (nodeId) {
          setSelectedEdge(null);
          onInspect(nodeId);
        }
        const edgeId = event.target.closest(".react-flow__edge")?.getAttribute("data-id");
        const edge = edges.find((entry) => entry.id === edgeId);
        if (edge) inspectEdge(edge);
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      if (!event.target.closest(".react-flow__node, .react-flow__nodesselection")) return;
      requestAnimationFrame(() => store.setLayout(captureLayout(getNodes(), store.getLayout())));
    },
    [edges, getNodes, inspectEdge, onInspect, onSelect, store],
  );
  return { selectedEdge, ariaLabelConfig, onNodesChange, onEdgesChange, onNodeClick, onEdgeClick, onKeyDown, onKeyUp };
}
