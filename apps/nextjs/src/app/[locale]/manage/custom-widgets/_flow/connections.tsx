"use client";
import { useState } from "react";
import { ActionIcon, Alert, Button, Group, Select, Stack, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconUnlink } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { connectionIssue, createFlowCommands, isGraphEditable } from "./commands";
import type { WidgetNode, WidgetEdge } from "./graph";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { useFlowConnection } from "./connection-provider";

interface Props {
  node: WidgetNode;
  nodes: WidgetNode[];
  edges: WidgetEdge[];
  form: CustomWidgetWorkbenchForm;
  onSelect(id: string): void;
}

export function Connections(props: Props) {
  return <ConnectionEditor key={props.node.id} {...props} />;
}

function ConnectionEditor({ node, nodes, edges, form, onSelect }: Props) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const connect = useFlowConnection();
  const [target, setTarget] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const editable = isGraphEditable(store.getValues());
  const destinations = nodes.filter(
    (other) =>
      !connectionIssue({ source: node.id, target: other.id }, nodes) &&
      (other.data.kind === "widget" ||
        node.data.kind === "options" ||
        !edges.some((edge) => edge.source === node.id && edge.target === other.id)),
  );
  const sources = nodes.filter(
    (other) =>
      !connectionIssue({ source: other.id, target: node.id }, nodes) &&
      (node.data.kind === "widget" ||
        other.data.kind === "options" ||
        !edges.some((edge) => edge.source === other.id && edge.target === node.id)),
  );
  const related = edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const commands = createFlowCommands(form, store);
  return (
    <Stack gap={6} mb="sm">
      {(!editable || issue) && (
        <Alert color="yellow" p="xs" aria-live="polite">
          {t((issue ?? "invalidGraphJson") as "codeOwned")}
        </Alert>
      )}
      {related.map((edge) => {
        let otherId = edge.source;
        if (edge.source === node.id) otherId = edge.target;
        const other = nodes.find((entry) => entry.id === otherId);
        let Direction = IconArrowLeft;
        if (edge.source === node.id) Direction = IconArrowRight;
        let disconnectLabel = t("disconnect");
        if (edge.data?.generatedBindingIds?.length) disconnectLabel = t("bindingDisconnect");
        return (
          <Group key={edge.id} gap={4} wrap="nowrap">
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<Direction size={14} />}
              onClick={() => other && onSelect(other.id)}
            >
              {t(`relationship.${edge.data?.relationship ?? "data"}`)} · {other?.data.label}
            </Button>
            {(edge.data?.relationship === "invalidates" || !!edge.data?.generatedBindingIds?.length) && (
              <Tooltip label={disconnectLabel}>
                <ActionIcon
                  type="button"
                  size="sm"
                  variant="subtle"
                  aria-label={disconnectLabel}
                  disabled={!editable}
                  onClick={() => setIssue(commands.disconnect(edge))}
                >
                  <IconUnlink size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        );
      })}
      {sources.length > 0 && (
        <Group align="end" wrap="nowrap">
          <Select
            label={t("connectFrom")}
            size="xs"
            value={source}
            onChange={setSource}
            disabled={!editable}
            searchable
            data={sources.map((entry) => ({
              value: entry.id,
              label: `${t(`kind.${entry.data.kind}`)} · ${entry.data.label}`,
            }))}
          />
          <Button
            size="xs"
            type="button"
            disabled={!editable || !sources.some((entry) => entry.id === source)}
            onClick={() => {
              if (!source) return;
              const result = connect({ source, target: node.id, sourceHandle: "out", targetHandle: "in" }, nodes);
              setIssue(result);
              if (!result) setSource(null);
            }}
          >
            {t("connect")}
          </Button>
        </Group>
      )}
      {destinations.length > 0 && (
        <Group align="end" wrap="nowrap">
          <Select
            label={t("connectTo")}
            size="xs"
            value={target}
            onChange={setTarget}
            disabled={!editable}
            searchable
            data={destinations.map((entry) => ({
              value: entry.id,
              label: `${t(`kind.${entry.data.kind}`)} · ${entry.data.label}`,
            }))}
          />
          <Button
            size="xs"
            type="button"
            disabled={!editable || !destinations.some((entry) => entry.id === target)}
            onClick={() => {
              if (!target) return;
              const result = connect({ source: node.id, target, sourceHandle: "out", targetHandle: "in" }, nodes);
              setIssue(result);
              if (!result) setTarget(null);
            }}
          >
            {t("connect")}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
