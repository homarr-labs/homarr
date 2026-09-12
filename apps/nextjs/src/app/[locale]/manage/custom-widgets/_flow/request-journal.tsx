"use client";
import { Badge, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { useWorkbenchJournal } from "./execution";
import { executionRequestIdentifier } from "./execution-store";
import { useWorkbenchSelection } from "./selection";

export function inspectExecutedRequest(requestId: string) {
  window.dispatchEvent(new CustomEvent("homarr:widget-request-inspect", { detail: { requestId, field: "path" } }));
}
export function openExecutionPanel(requestId: string, panel: "data" | "journal") {
  window.dispatchEvent(new CustomEvent("homarr:widget-execution-panel", { detail: { requestId, panel } }));
}
export function WorkbenchRequestJournal({ requestId }: { requestId?: string }) {
  const t = useI18n("customWidget.flow");
  const selection = useWorkbenchSelection();
  const journal = useWorkbenchJournal();
  const entries = journal.filter((entry) => !requestId || executionRequestIdentifier(entry.requestId) === requestId);
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          {t("requestJournal")}
        </Text>
        {requestId && (
          <Button size="compact-xs" variant="subtle" onClick={() => openExecutionPanel(requestId, "journal")}>
            {t("viewJournal")}
          </Button>
        )}
      </Group>
      {entries.length === 0 && (
        <Text size="xs" c="dimmed">
          {t("execution.noJournal")}
        </Text>
      )}
      {entries.map((entry) => {
        const identifier = executionRequestIdentifier(entry.requestId);
        let label = String(entry.status ?? t("execution.error"));
        let color = "teal";
        if (entry.status === null || entry.status >= 400) color = "red";
        if (entry.simulated) {
          label = t("execution.simulated");
          color = "grape";
        }
        const selected = selection === `request:${identifier}` || selection === `native:${identifier}`;
        return (
          <UnstyledButton
            key={entry.id}
            p="xs"
            aria-label={t("inspectRequest", { name: identifier })}
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-sm)",
              background: selected ? "var(--mantine-primary-color-light)" : undefined,
            }}
            onClick={() => inspectExecutedRequest(identifier)}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" fw={600} truncate>
                {identifier}
              </Text>
              <Badge size="xs" color={color}>
                {label}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" truncate>
              {entry.method} {entry.path}
            </Text>
            <Group gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                {Math.round(entry.durationMs)} ms
              </Text>
              <Text component="time" dateTime={new Date(entry.timestamp).toISOString()} size="xs" c="dimmed">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Text>
            </Group>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
