"use client";

import { Button, Code, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";

function fields(value: unknown) {
  const result: Array<{ path: string; value: unknown }> = [];
  let visited = 0;
  const visit = (entry: unknown, path: string, depth: number) => {
    if (++visited > 500 || result.length >= 100) return;
    if (depth >= 5 && entry !== null && typeof entry === "object") return;
    if (entry === null || typeof entry !== "object") {
      result.push({ path, value: entry });
      return;
    }
    for (const [key, child] of Object.entries(entry).slice(0, 30)) {
      if (visited >= 500 || result.length >= 100) break;
      visit(child, `${path}[${JSON.stringify(key)}]`, depth + 1);
    }
  };
  visit(value, "data", 0);
  return result;
}

const insert = (expression: string) =>
  window.dispatchEvent(
    new CustomEvent("homarr:widget-code-insert", {
      detail: { editorId: "jsx-editor", text: `{${expression}}` },
    }),
  );

export function DataBindings({ data }: { data: Record<string, unknown> }) {
  const t = useI18n("customWidget.flow");
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t("bindingInspectorHint")}
      </Text>
      <ScrollArea mah={260}>
        <Stack gap={6}>
          {fields(data).map((field) => (
            <Group key={field.path} justify="space-between" wrap="nowrap">
              <Code style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{field.path}</Code>
              <Button size="compact-xs" variant="subtle" onClick={() => insert(field.path)}>
                {t("insertBinding")}
              </Button>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
