"use client";
import { memo, useMemo } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import type { PreviewState } from "./preview-state";
import { LazyOnceAccordion } from "../_lazy-once-accordion";
import { DataBindings } from "./data-bindings";
import { FlowExecutionStatus, useWorkbenchQuery, useWorkbenchRequestStatus } from "./execution";
import { openExecutionPanel, WorkbenchRequestJournal } from "./request-journal";

export const RequestExecutionInspector = memo(function RequestExecutionInspector({
  requestId,
  preview,
}: {
  requestId: string;
  preview: PreviewState;
}) {
  const t = useI18n("customWidget.flow");
  const status = useWorkbenchRequestStatus(requestId);
  const query = useWorkbenchQuery(requestId);
  let value = preview.data[requestId];
  if (query) value = query.data;
  const data = useMemo(() => ({ [requestId]: value }), [value, requestId]);
  const hasData = query?.hasData ?? Object.hasOwn(preview.data, requestId);
  return (
    <Stack gap="xs" mb="sm">
      <Group justify="space-between">
        <FlowExecutionStatus requestId={requestId} />
        <Button size="compact-xs" variant="subtle" onClick={() => openExecutionPanel(requestId, "data")}>
          {t("viewQueryData")}
        </Button>
      </Group>
      {status.error && (
        <Alert color="red" p="xs">
          {status.error}
        </Alert>
      )}
      <LazyOnceAccordion label={t("latestResponse")}>
        {hasData ? (
          <DataBindings data={data} />
        ) : (
          <Text size="xs" c="dimmed">
            {t("execution.noData")}
          </Text>
        )}
      </LazyOnceAccordion>
      <LazyOnceAccordion label={t("requestJournal")}>
        <WorkbenchRequestJournal requestId={requestId} />
      </LazyOnceAccordion>
    </Stack>
  );
});
