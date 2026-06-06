"use client";

import { Button, Drawer, Stack, TextInput, Textarea, SegmentedControl, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { FlowNode } from "../types";

interface ConfigPanelProps {
  node: FlowNode | null;
  opened: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
}

const nodeTypeConfigs: Record<
  string,
  Array<{ key: string; labelKey: string; type: "text" | "textarea" | "segmented"; options?: string[] }>
> = {
  httpRequest: [
    { key: "url", labelKey: "url", type: "text" },
    { key: "method", labelKey: "method", type: "segmented", options: ["GET", "POST"] },
    { key: "body", labelKey: "requestBody", type: "textarea" },
  ],
  jsonPath: [{ key: "expression", labelKey: "expression", type: "text" }],
  merge: [{ key: "mode", labelKey: "mode", type: "segmented", options: ["array", "object"] }],
  template: [{ key: "template", labelKey: "templateStr", type: "text" }],
  singleValue: [
    { key: "label", labelKey: "label", type: "text" },
    { key: "unit", labelKey: "unit", type: "text" },
  ],
  keyValue: [
    { key: "labels", labelKey: "labels", type: "text" },
    { key: "units", labelKey: "units", type: "text" },
  ],
  table: [
    { key: "columnHeaders", labelKey: "columnHeaders", type: "text" },
    { key: "columnAccessors", labelKey: "columnAccessors", type: "text" },
  ],
  lineChart: [
    { key: "xKey", labelKey: "xKey", type: "text" },
    { key: "yKeys", labelKey: "yKeys", type: "text" },
    { key: "height", labelKey: "height", type: "text" },
  ],
  areaChart: [
    { key: "xKey", labelKey: "xKey", type: "text" },
    { key: "yKeys", labelKey: "yKeys", type: "text" },
    { key: "height", labelKey: "height", type: "text" },
  ],
  barChart: [
    { key: "xKey", labelKey: "xKey", type: "text" },
    { key: "yKeys", labelKey: "yKeys", type: "text" },
    { key: "height", labelKey: "height", type: "text" },
  ],
  sparkline: [
    { key: "height", labelKey: "height", type: "text" },
    { key: "color", labelKey: "color", type: "text" },
  ],
};

export function ConfigPanel({ node, opened, onClose, onUpdate, onDelete }: ConfigPanelProps) {
  const t = useScopedI18n("customWidget.flowEditor");

  if (!node) return null;

  const fields = nodeTypeConfigs[node.type] ?? [];

  const handleChange = (key: string, value: string) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t("configure", { nodeType: t(`node.${node.type}` as never) })}
      position="right"
      size="sm"
    >
      <Stack gap="sm">
        <TextInput
          label={t("nodeLabel")}
          value={(node.data.label as string) ?? ""}
          onChange={(e) => handleChange("label", e.target.value)}
        />
        {fields.map((field) => {
          const label = t(`configField.${field.labelKey}` as never);
          const fieldRenderers: Record<string, () => React.ReactNode> = {
            text: () => (
              <TextInput
                key={field.key}
                label={label}
                value={String(node.data[field.key] ?? "")}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            ),
            textarea: () => (
              <Textarea
                key={field.key}
                label={label}
                value={String(node.data[field.key] ?? "")}
                onChange={(e) => handleChange(field.key, e.target.value)}
                minRows={3}
              />
            ),
            segmented: () => (
              <div key={field.key}>
                <Text size="sm" fw={500} mb={4}>
                  {label}
                </Text>
                <SegmentedControl
                  data={(field.options ?? []).map((opt) => ({
                    value: opt,
                    label: t(`option.${opt}` as never),
                  }))}
                  value={String(node.data[field.key] ?? field.options?.[0] ?? "")}
                  onChange={(value) => handleChange(field.key, value)}
                  fullWidth
                />
              </div>
            ),
          };

          const renderer = fieldRenderers[field.type] ?? fieldRenderers.text!;
          return renderer!();
        })}
        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={14} />}
          onClick={() => {
            onDelete(node.id);
            onClose();
          }}
        >
          {t("deleteNode")}
        </Button>
      </Stack>
    </Drawer>
  );
}
