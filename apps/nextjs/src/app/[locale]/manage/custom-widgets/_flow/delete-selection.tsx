"use client";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { buildDefinition } from "../_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { createFlowCommands } from "./commands";
import { projectWidgetGraph } from "./graph";
import type { WidgetNode, WidgetEdge } from "./graph";
import { ungroupNodes, captureLayout } from "./layout";

export function DeleteSelection({
  opened,
  onClose,
  selection,
  nodes,
  edges,
  form,
  onSelect,
}: {
  opened: boolean;
  onClose(): void;
  selection: string[];
  nodes: WidgetNode[];
  edges: WidgetEdge[];
  form: CustomWidgetWorkbenchForm;
  onSelect(id: string): void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const targets = nodes.filter((node) => selection.includes(node.id) && node.data.kind !== "widget");
  const validDraft = !opened || buildDefinition(store.getValues()).success;
  const targetIds = new Set(targets.map((node) => node.id));
  const dependencies = edges.filter((edge) => {
    if (targetIds.has(edge.source) && targetIds.has(edge.target)) return false;
    if (edge.data?.relationship === "invalidates" || edge.data?.relationship === "invoke")
      return targetIds.has(edge.target);
    return targetIds.has(edge.source);
  });
  const dependants = [...new Set(dependencies.map((edge) => (targetIds.has(edge.source) ? edge.target : edge.source)))];
  const remove = () => {
    if (!buildDefinition(store.getValues()).success) return;
    // Recheck current references when confirming; a deferred graph is never deletion authority.
    const current = projectWidgetGraph(store.getValues(), store.getLayout());
    const latestIds = new Set(current.nodes.filter((node) => targetIds.has(node.id)).map((node) => node.id));
    if (
      current.edges.some((edge) => {
        if (latestIds.has(edge.source) && latestIds.has(edge.target)) return false;
        if (["invalidates", "invoke"].includes(edge.data?.relationship ?? "")) return latestIds.has(edge.target);
        return latestIds.has(edge.source);
      })
    )
      return;
    store.transaction(() => {
      const marked = current.nodes.map((node) => ({
        ...node,
        selected: targetIds.has(node.id) && node.data.kind === "group",
      }));
      store.setLayout(captureLayout(ungroupNodes(marked), store.getLayout()));
      createFlowCommands(form, store).remove(targets);
    });
    onClose();
    onSelect("widget");
  };
  return (
    <Modal opened={opened} onClose={onClose} title={t("deleteSelection")}>
      <Stack gap="sm">
        <Text size="sm">
          {t("deleteSelectionDescription", { names: targets.map((node) => node.data.label).join(", ") })}
        </Text>
        {!validDraft && <Alert color="yellow">{t("invalidDeletion")}</Alert>}
        {dependants.length > 0 && (
          <Alert color="yellow" title={t("resolveReferences")}>
            <Text size="sm">{t("resolveReferencesDescription")}</Text>
            <Stack mt="xs" gap={4}>
              {dependants.map((id) => (
                <Button
                  key={id}
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => {
                    onClose();
                    onSelect(id);
                  }}
                >
                  {nodes.find((node) => node.id === id)?.data.label ?? id}
                </Button>
              ))}
            </Stack>
          </Alert>
        )}
        <Group justify="end">
          <Button variant="default" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button color="red" disabled={!validDraft || targets.length === 0 || dependants.length > 0} onClick={remove}>
            {t("delete")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
