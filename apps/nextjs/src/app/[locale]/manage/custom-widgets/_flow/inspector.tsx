"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { RefObject } from "react";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconCopy, IconPalette, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { createFlowCommands } from "./commands";
import { isExtensionKind } from "./extension-commands";
import { RequestExecutionInspector } from "./request-execution";
import { projectWidgetGraph } from "./graph";
import type { WidgetNode, WidgetEdge } from "./graph";
import type { FlowWorkbenchProps } from "./workbench-types";
import { placeAddedNodes } from "./node-placement";
import { Connections } from "./connections";
import { DraftRecoverySettings } from "./recovery";
import classes from "./workbench.module.css";
const WorkbenchExtensions = dynamic(() => import("./extensions").then((module) => module.WorkbenchExtensions), {
  ssr: false,
});
const WorkbenchAssistant = dynamic(() => import("./assistant").then((module) => module.WorkbenchAssistant), {
  ssr: false,
});
export function WorkbenchInspector({
  sections,
  node,
  graph,
  selected,
  selection,
  pane,
  setPane,
  mode,
  editable,
  extensionsOpened,
  setExtensionsOpened,
  select,
  onDelete,
  onClose,
  onAssistant,
  inspectorRef,
}: {
  sections: FlowWorkbenchProps;
  node?: WidgetNode;
  graph: { nodes: WidgetNode[]; edges: WidgetEdge[] };
  selected: string;
  selection: string[];
  pane: string;
  setPane(value: string): void;
  mode: string;
  editable: boolean;
  extensionsOpened: boolean;
  setExtensionsOpened(value: boolean): void;
  select(id: string): void;
  onDelete(): void;
  onClose(): void;
  onAssistant(): void;
  inspectorRef: RefObject<HTMLDivElement | null>;
}) {
  const t = useI18n("customWidget.flow");
  const closeLabel = useI18n("common.action")("close");
  const store = useCustomWidgetFormDocumentStore();
  const commands = useMemo(() => createFlowCommands(sections.form, store), [sections.form, store]);
  const category = node?.data.kind ?? "general";
  const formMode = mode !== "flow";
  const canDuplicate = node && (["source", "query", "action"].includes(category) || isExtensionKind(category));
  let title = node?.data.label ?? t("general");
  if (formMode) title = t("form");
  else if (pane === "assistant") title = t("assistant");
  else if (pane === "manifest") title = t("manifest");
  else if (pane === "extensions" && !isExtensionKind(category)) title = t("stylesAndCapabilities");
  const assistantPane = useMemo(
    () => (
      <WorkbenchAssistant form={sections.form} selected={selected} onSelect={select} onPreview={sections.onPreview} />
    ),
    [sections.form, sections.onPreview, selected, select],
  );
  const openExtensions = () => {
    setExtensionsOpened(true);
    setPane("extensions");
  };
  const duplicate = () => {
    if (!node) return;
    store.transaction(() => {
      const previous = projectWidgetGraph(store.getValues(), store.getLayout()).nodes;
      const id = commands.duplicate(node);
      if (id === node.id) return;
      const next = projectWidgetGraph(store.getValues(), store.getLayout()).nodes;
      store.setLayout({
        ...store.getLayout(),
        nodes: { ...store.getLayout().nodes, ...placeAddedNodes(previous, next, id, node.id) },
      });
      select(id);
    });
  };
  return (
    <aside ref={inspectorRef} className={classes.inspector} aria-label={title}>
      <Group className={classes.inspectorHeader} justify="space-between" wrap="nowrap" mb="sm">
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text component="h2" m={0} size="sm" fw={600} truncate>
            {title}
          </Text>
          {node && !formMode && pane !== "assistant" && (
            <Text size="xs" c="dimmed">
              {t(`kind.${node.data.kind}`)}
            </Text>
          )}
        </Stack>
        <Group gap={4} wrap="nowrap">
          {pane !== "assistant" && (
            <Tooltip label={t("assistant")}>
              <ActionIcon variant="subtle" aria-label={t("assistant")} onClick={onAssistant}>
                <IconSparkles size={17} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={closeLabel}>
            <ActionIcon variant="subtle" aria-label={closeLabel} onClick={onClose}>
              <IconX size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      {(formMode || (pane === "inspector" && category === "general")) && <DraftRecoverySettings />}
      <div hidden={!formMode && pane !== "inspector"}>
        <div hidden={!formMode && category !== "general"}>{sections.general}</div>
        <div hidden={!formMode && category !== "widget"}>{sections.template}</div>
        <div hidden={!formMode && category !== "source"}>{sections.sources}</div>
        <div hidden={!formMode && !["query", "action"].includes(category)}>{sections.requests}</div>
        <div hidden={!formMode && category !== "options"}>{sections.options}</div>
        {node?.data.kind === "group" && (
          <TextInput
            label={t("groupName")}
            value={node.data.label}
            maxLength={128}
            onChange={(event) => {
              const current = store.getLayout();
              const group = current.groups[node.id];
              if (!group) return;
              store.setLayout({
                ...current,
                groups: { ...current.groups, [node.id]: { ...group, title: event.currentTarget.value } },
              });
            }}
          />
        )}
        {!formMode && category === "widget" && (
          <Button
            size="compact-xs"
            mt="sm"
            variant="subtle"
            leftSection={<IconPalette size={15} />}
            onClick={openExtensions}
          >
            {t("stylesAndCapabilities")}
          </Button>
        )}
        {node && ["query", "action"].includes(category) && (
          <RequestExecutionInspector requestId={node.data.identifier} preview={sections.execution} />
        )}
        {formMode && sections.assistant}
      </div>
      <div className={classes.assistantPane} hidden={formMode || pane !== "assistant"} data-flow-assistant>
        {assistantPane}
      </div>
      <div hidden={formMode || pane !== "extensions"}>
        {extensionsOpened && (
          <WorkbenchExtensions
            form={sections.form}
            selected={selected}
            preview={sections.execution}
            onSelect={select}
          />
        )}
      </div>
      {node && !formMode && ["inspector", "extensions"].includes(pane) && (
        <Connections node={node} nodes={graph.nodes} edges={graph.edges} form={sections.form} onSelect={select} />
      )}
      <div hidden={!formMode && pane !== "manifest"}>{sections.advanced}</div>
      {!formMode && pane !== "assistant" && (
        <Group gap={4} mt="sm">
          {pane !== "inspector" && !isExtensionKind(category) && (
            <Button size="compact-xs" variant="subtle" onClick={() => setPane("inspector")}>
              {t("backToNode")}
            </Button>
          )}
          {canDuplicate && (
            <Button
              size="compact-xs"
              variant="subtle"
              disabled={!editable}
              leftSection={<IconCopy size={14} />}
              onClick={duplicate}
            >
              {t("duplicate")}
            </Button>
          )}
          {selection.some((id) => id !== "widget") && (
            <Button
              size="compact-xs"
              color="red"
              variant="subtle"
              leftSection={<IconTrash size={14} />}
              onClick={onDelete}
            >
              {t("deleteSelection")}
            </Button>
          )}
        </Group>
      )}
    </aside>
  );
}
