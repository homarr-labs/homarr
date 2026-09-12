"use client";

import { useState } from "react";
import { Button, Collapse, Group, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormAnalysisField } from "../_use-custom-widget-form-analysis";
import classes from "./workbench.module.css";

export function WorkbenchProblems({ onSelect }: { onSelect(id: string): void }) {
  const [opened, setOpened] = useState(false);
  const t = useI18n("customWidget.flow");
  const diagnosticsT = useI18n("customWidget.editor.diagnostics");
  const issues = useCustomWidgetFormAnalysisField("previewValidationIssues");
  const template = useCustomWidgetFormAnalysisField("templateDiagnostics");
  const requests = useCustomWidgetFormAnalysisField("requestDiagnostics");
  const entries = [
    ...issues.map((issue) => ({ ...issue, index: undefined as number | undefined })),
    ...template.map((entry) => ({
      path: "template",
      index: entry.index,
      message: diagnosticsT(entry.code, { value: entry.value ?? "" }),
    })),
    ...requests.map((entry) => ({
      path: "requests",
      index: entry.index,
      message: diagnosticsT(entry.code, { value: entry.value ?? "" }),
    })),
  ];
  const reveal = (path: string | undefined, index: number | undefined) => {
    const [field, id, nativeId] = (path ?? "").split(".");
    let nodeId = "widget";
    if (field === "sources" && id) nodeId = `source:${id}`;
    if (field === "requests" && id) nodeId = `request:${id}`;
    if (field === "options") nodeId = "options";
    if (field === "extensions" && id === "native" && nativeId) nodeId = `native:${nativeId}`;
    onSelect(nodeId);
    if (index !== undefined)
      window.dispatchEvent(
        new CustomEvent("homarr:widget-code-reveal", {
          detail: { editorId: field === "requests" ? "requests-editor" : "jsx-editor", index },
        }),
      );
  };
  return (
    <div className={classes.problems} style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
      <Group px="xs" justify="space-between">
        <Button size="compact-xs" variant="subtle" aria-expanded={opened} onClick={() => setOpened(!opened)}>
          {t("problems", { count: entries.length })}
        </Button>
        <Text size="xs" c="dimmed" component="output">
          {entries.length === 0 && t("noProblems")}
        </Text>
      </Group>
      <Collapse expanded={opened}>
        <ScrollArea mah={220}>
          <Stack gap={4} p="xs">
            {entries.map((entry, index) => (
              <UnstyledButton key={`${entry.path}:${index}`} onClick={() => reveal(entry.path, entry.index)}>
                <Text size="xs" c="red">
                  {entry.path}: {entry.message}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea>
      </Collapse>
    </div>
  );
}
