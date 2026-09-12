"use client";
import { Button, Modal, Stack, Text } from "@mantine/core";
import type { Connection } from "@xyflow/react";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { createFlowCommands, isGraphEditable } from "./commands";
import { projectWidgetGraph, readObject, record } from "./graph";
import type { FlowKind } from "./graph";
import { placeAddedNodes } from "./node-placement";
import { useFlowConnection } from "./connection-provider";
import { connectionIssue, planFlowConnection } from "./connection-planner";
export interface PendingConnection {
  nodeId: string;
  handleType: "source" | "target";
  position: { x: number; y: number };
}
export function AddNextStep({
  pending,
  form,
  onClose,
  onSelect,
}: {
  pending: PendingConnection | null;
  form: CustomWidgetWorkbenchForm;
  onClose(): void;
  onSelect(id: string): void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const connect = useFlowConnection();
  if (!pending) return null;
  const graph = projectWidgetGraph(store.getValues(), store.getLayout());
  const node = graph.nodes.find((entry) => entry.id === pending?.nodeId);
  const kinds: FlowKind[] = [];
  if (pending?.handleType === "source" && node?.data.kind === "source") kinds.push("query", "action");
  if (pending?.handleType === "source" && node?.data.kind === "action") kinds.push("query");
  if (pending?.handleType === "target" && node && ["query", "action"].includes(node.data.kind)) kinds.push("source");
  if (node?.data.kind === "widget") {
    kinds.push("query", "action");
    if (pending.handleType === "target") kinds.push("options");
  }
  if (node?.data.kind === "options" && pending.handleType === "source") kinds.push("query", "action");
  const existing = graph.nodes.filter((entry) => {
    let source = pending.nodeId;
    let target = entry.id;
    if (pending.handleType === "target") {
      source = entry.id;
      target = pending.nodeId;
    }
    return !connectionIssue({ source, target }, graph.nodes);
  });
  const add = (kind: FlowKind) => {
    if (!pending || !node || !isGraphEditable(store.getValues())) return;
    let id = "widget";
    let binding: Connection | undefined;
    store.transaction(() => {
      const previous = projectWidgetGraph(store.getValues(), store.getLayout()).nodes;
      const commands = createFlowCommands(form, store);
      let sourceId: string | undefined;
      if (node.data.kind === "source") sourceId = node.data.identifier;
      if (node.data.kind === "action") {
        const source = record(readObject(store.getValues().requests)[node.data.identifier]).source;
        if (typeof source === "string") sourceId = source;
      }
      id = commands.add(kind, sourceId);
      const nextGraph = projectWidgetGraph(store.getValues(), store.getLayout());
      let source = pending.nodeId;
      let target = id;
      if (pending.handleType === "target") {
        source = id;
        target = pending.nodeId;
      }
      const connection = { source, target, sourceHandle: "out", targetHandle: "in" };
      if (planFlowConnection(connection, nextGraph.nodes, store.getValues()) === "direct")
        commands.connect(connection, nextGraph.nodes);
      else binding = connection;
      store.setLayout({
        ...store.getLayout(),
        nodes: { ...store.getLayout().nodes, ...placeAddedNodes(previous, nextGraph.nodes, id, pending.position) },
      });
    });
    onClose();
    onSelect(id);
    if (binding) connect(binding, projectWidgetGraph(store.getValues(), store.getLayout()).nodes);
  };
  return (
    <Modal
      opened={!!pending}
      onClose={onClose}
      title={t("addNextStep")}
      closeButtonProps={{ "aria-label": t("bindingCancel") }}
      size="sm"
    >
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          {t("nextStepFor", { name: node?.data.label ?? "" })}
        </Text>
        {kinds.map((kind) => (
          <Button key={kind} disabled={!isGraphEditable(store.getValues())} variant="light" onClick={() => add(kind)}>
            {t(`kind.${kind}`)}
          </Button>
        ))}
        {existing.map((entry) => (
          <Button
            key={entry.id}
            disabled={!isGraphEditable(store.getValues())}
            variant="subtle"
            onClick={() => {
              let source = pending.nodeId;
              let target = entry.id;
              if (pending.handleType === "target") {
                source = entry.id;
                target = pending.nodeId;
              }
              const issue = connect({ source, target, sourceHandle: "out", targetHandle: "in" }, graph.nodes);
              if (issue) return;
              onClose();
              onSelect(entry.id);
            }}
          >
            {t("bindingConnectExisting", { name: entry.data.label })}
          </Button>
        ))}
        {kinds.length === 0 && existing.length === 0 && <Text size="sm">{t("codeOwned")}</Text>}
      </Stack>
    </Modal>
  );
}
