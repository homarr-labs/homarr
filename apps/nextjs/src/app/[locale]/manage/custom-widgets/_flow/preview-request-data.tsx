"use client";
import { memo, useMemo } from "react";
import { Button, Group, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { CodeEditor } from "../_code-editor";
import type { PreviewState } from "./preview-state";
import { DataBindings } from "./data-bindings";
import { useWorkbenchQueryData } from "./execution";

export const PreviewRequestData = memo(function PreviewRequestData({
  preview,
  requestId,
  onShowAll,
}: {
  preview: PreviewState;
  requestId?: string;
  onShowAll(): void;
}) {
  const t = useI18n("customWidget.flow");
  const previewT = useI18n("customWidget.workbench.preview");
  const execution = useWorkbenchQueryData();
  const data = execution?.data ?? preview.data;
  const status = execution?.status ?? preview.status;
  const snapshot = useMemo(() => {
    if (!requestId) return { data, status };
    return { data: { [requestId]: data[requestId] }, status: { [requestId]: status[requestId] } };
  }, [data, status, requestId]);
  const serialized = useMemo(() => JSON.stringify(snapshot, null, 2), [snapshot]);
  return (
    <>
      {requestId && (
        <Group justify="space-between" mb="xs">
          <Text size="xs" fw={600}>
            {requestId}
          </Text>
          <Button size="compact-xs" variant="subtle" onClick={onShowAll}>
            {t("allQueryData")}
          </Button>
        </Group>
      )}
      <DataBindings data={snapshot.data} />
      <CodeEditor
        id="preview-data"
        label={previewT("requestData")}
        language="json"
        value={serialized}
        readOnly
        onChange={() => undefined}
      />
    </>
  );
});
