"use client";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Alert, Loader } from "@mantine/core";
import type { ReactFlowInstance } from "@xyflow/react";
import { useI18n } from "@homarr/translation/client";
import {
  useCustomWidgetFormDocumentStore,
  useDeferredCustomWidgetFormDocumentValues,
} from "../_custom-widget-form-state";
import { createFlowCommands, isGraphEditable } from "./commands";
import { projectWidgetGraph } from "./graph";
import { placeAddedNodes } from "./node-placement";
import type { FlowKind, WidgetNode, WidgetEdge } from "./graph";
import { useWorkbenchRenames, WorkbenchSelectionContext } from "./selection";
import { captureLayout, groupNodes, projectLayout, ungroupNodes } from "./layout";
import { WorkbenchOutline } from "./outline";
import { WorkbenchStart } from "./start";
import { DeleteSelection } from "./delete-selection";
import { WorkbenchProblems } from "./problems";
import { useWorkbenchKeybindings } from "./keybindings";
import { WorkbenchToolbar } from "./toolbar";
import { CanvasPreviewProvider } from "./canvas-preview";
import { FlowConnectionProvider } from "./connection-provider";
import { DraftRecoveryAlert, DraftRecoveryProvider } from "./recovery";
import { WorkbenchExecutionProvider } from "./execution";
import { WorkbenchInspector } from "./inspector";
import { useWorkbenchFullscreen } from "./fullscreen";
import { restoreWorkbenchFocus } from "./return-focus";
import type { FlowWorkbenchProps } from "./workbench-types";
import classes from "./workbench.module.css";

const Canvas = dynamic(() => import("./canvas"), { ssr: false, loading: () => <Loader m="auto" size="sm" /> });
export function FlowWorkbench(props: FlowWorkbenchProps) {
  const { fullscreen, ref: workspaceRef, toggleFullscreen } = useWorkbenchFullscreen();
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const values = useDeferredCustomWidgetFormDocumentValues();
  const [selected, setSelected] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  useWorkbenchRenames(store, setSelected, setSelection);
  const [search, setSearch] = useState("");
  const [pane, setPane] = useState("inspector");
  const [extensionsOpened, setExtensionsOpened] = useState(false);
  const [mode, setMode] = useState("flow");
  const [libraryHidden, setLibraryHidden] = useState(true);
  const [inspectorHidden, setInspectorHidden] = useState(true);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<ReactFlowInstance<WidgetNode, WidgetEdge> | null>(null);
  const layout = useSyncExternalStore(store.subscribeEditor, store.getLayout, store.getLayout);
  const semanticGraph = useMemo(() => projectWidgetGraph(values, { version: 1, nodes: {}, groups: {} }), [values]);
  const graph = useMemo(
    () => ({ ...semanticGraph, nodes: projectLayout(semanticGraph.nodes, layout) }),
    [semanticGraph, layout],
  );
  const commands = useMemo(() => createFlowCommands(props.form, store), [props.form, store]);
  const node = graph.nodes.find((entry) => entry.id === selected);
  const category = node?.data.kind ?? "general";
  const editable = isGraphEditable(values);
  const inspect = useCallback((id: string) => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setSelected(id);
    setInspectorHidden(false);
    if (["native:", "fragment:", "preference:", "content:"].some((prefix) => id.startsWith(prefix))) {
      setPane("extensions");
      setExtensionsOpened(true);
    } else setPane("inspector");
  }, []);
  const select = useCallback(
    (id: string) => {
      inspect(id);
      setLibraryHidden(true);
      const ids: string[] = [];
      if (id !== "general" && !id.endsWith(":new")) ids.push(id);
      setSelection(ids);
    },
    [inspect],
  );
  const edit = useCallback(
    (id: string) => {
      select(id);
      requestAnimationFrame(() => {
        let selector = '.cm-content, input:not([type="hidden"]), textarea';
        if (id === "general") selector = "#general input";
        const fields = inspectorRef.current?.querySelectorAll<HTMLElement>(selector);
        Array.from(fields ?? [])
          .find((field) => field.checkVisibility())
          ?.focus();
      });
    },
    [select],
  );
  const selectMany = useCallback((ids: string[]) => {
    setSelection((previous) => {
      if (previous.length === ids.length && previous.every((id) => ids.includes(id))) return previous;
      return ids;
    });
  }, []);
  const toggle = (id: string) => {
    setSelection((previous) => {
      if (previous.includes(id)) return previous.filter((entry) => entry !== id);
      return [...previous, id];
    });
  };
  const group = (remove: boolean) => {
    const nodes = (canvas.current?.getNodes() ?? graph.nodes).map((entry) => ({
      ...entry,
      selected: selection.includes(entry.id),
    }));
    let next;
    if (remove) next = ungroupNodes(nodes);
    else next = groupNodes(nodes, t("kind.group"));
    store.setLayout(captureLayout(next, store.getLayout()));
    const ids = next.filter((entry) => entry.selected).map((entry) => entry.id);
    setSelection(ids);
    if (ids[0]) inspect(ids[0]);
  };
  const add = (kind: FlowKind) => {
    if (!isGraphEditable(store.getValues())) return;
    store.transaction(() => {
      const measured = new Map(canvas.current?.getNodes().map((entry) => [entry.id, entry]));
      const previous = projectWidgetGraph(store.getValues(), store.getLayout()).nodes.map((entry) => ({
        ...measured.get(entry.id),
        ...entry,
      }));
      const id = commands.add(kind);
      if (id.endsWith(":new")) {
        select(id);
        return;
      }
      const next = projectWidgetGraph(store.getValues(), store.getLayout()).nodes;
      store.setLayout({
        ...store.getLayout(),
        nodes: { ...store.getLayout().nodes, ...placeAddedNodes(previous, next, id, selected) },
      });
      select(id);
      setLibraryHidden(true);
    });
  };
  const closeInspector = () => {
    setMode("flow");
    setInspectorHidden(true);
    requestAnimationFrame(() => {
      returnFocus.current = restoreWorkbenchFocus(workspaceRef.current, returnFocus.current, selected);
    });
  };
  const closeLibrary = () => {
    setLibraryHidden(true);
    workspaceRef.current?.querySelector<HTMLElement>("[data-workbench-library-toggle]")?.focus();
  };
  const openAssistant = () => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setPane("assistant");
    setInspectorHidden(false);
  };
  useWorkbenchKeybindings({
    store,
    selection,
    onDelete: () => setDeleteOpened(true),
    returnFocus,
    onSelect: select,
    onShowExecution: () => undefined,
    onCloseLibrary: closeLibrary,
    onClear: () => {
      setLibraryHidden(true);
      closeInspector();
      setSelected("");
      setSelection([]);
    },
  });
  return (
    <WorkbenchExecutionProvider preview={props.execution}>
      <WorkbenchSelectionContext.Provider value={mode === "flow" ? selected : undefined}>
        <FlowConnectionProvider form={props.form}>
          <DraftRecoveryProvider form={props.form} definitionId={props.definitionId}>
            <CanvasPreviewProvider preview={props.preview} edit={edit}>
              <section
                ref={workspaceRef}
                tabIndex={-1}
                className={classes.workbench}
                data-widget-workbench
                data-fullscreen={fullscreen}
                aria-label={t("workbench")}
                data-mode={mode}
                data-code={category === "widget" && pane === "inspector"}
                data-library-hidden={libraryHidden}
                data-inspector-hidden={inspectorHidden && mode === "flow"}
              >
                <WorkbenchToolbar
                  fullscreen={fullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  actions={props.actions}
                  definitionId={props.definitionId}
                  mode={mode}
                  setMode={(next) => {
                    setMode(next);
                    setInspectorHidden(next === "flow");
                  }}
                  libraryOpened={!libraryHidden}
                  onToggleLibrary={() => setLibraryHidden(!libraryHidden)}
                  onAssistant={openAssistant}
                  onGeneral={() => edit("general")}
                />
                {props.feedback}
                <DraftRecoveryAlert />
                {!editable && (
                  <Alert color="yellow" p="xs">
                    {t("invalidGraphJson")}
                  </Alert>
                )}
                <div className={classes.body}>
                  <WorkbenchOutline
                    start={
                      !props.definitionId && (
                        <WorkbenchStart
                          form={props.form}
                          onSelect={select}
                          onAssistant={openAssistant}
                          onIntegration={() => select("native:new")}
                        />
                      )
                    }
                    nodes={graph.nodes}
                    selectedIds={selection}
                    selected={selected}
                    search={search}
                    onSearch={setSearch}
                    onSelect={edit}
                    onClose={closeLibrary}
                    onToggle={toggle}
                    onAdd={add}
                    editable={editable}
                    onGroup={() => group(false)}
                    onUngroup={() => group(true)}
                  />
                  <div className={classes.center}>
                    <div className={classes.canvas}>
                      <Canvas
                        form={props.form}
                        selected={selected}
                        inspectorOpened={!inspectorHidden}
                        selection={selection}
                        onSelection={selectMany}
                        onSelect={edit}
                        onInspect={inspect}
                        onInit={(instance) => {
                          canvas.current = instance;
                        }}
                      />
                    </div>
                  </div>
                  <WorkbenchInspector
                    sections={props}
                    node={node}
                    graph={graph}
                    selected={selected}
                    selection={selection}
                    pane={pane}
                    setPane={setPane}
                    onClose={closeInspector}
                    onAssistant={openAssistant}
                    mode={mode}
                    editable={editable}
                    extensionsOpened={extensionsOpened}
                    setExtensionsOpened={setExtensionsOpened}
                    select={select}
                    onDelete={() => setDeleteOpened(true)}
                    inspectorRef={inspectorRef}
                  />
                </div>
                <WorkbenchProblems onSelect={select} />
                <DeleteSelection
                  opened={deleteOpened}
                  onClose={() => setDeleteOpened(false)}
                  selection={selection}
                  nodes={graph.nodes}
                  edges={graph.edges}
                  form={props.form}
                  onSelect={select}
                />
              </section>
            </CanvasPreviewProvider>
          </DraftRecoveryProvider>
        </FlowConnectionProvider>
      </WorkbenchSelectionContext.Provider>
    </WorkbenchExecutionProvider>
  );
}
