"use client";

import { memo, useMemo, useState } from "react";
import { Alert, Box, Card, Group, Paper, SegmentedControl, Stack, Switch, Tabs, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { analyzeCustomWidgetAccessibility, PreviewErrorBoundary } from "@homarr/custom-widgets/workbench";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";

import { CodeEditor } from "./_code-editor";
import { getPreviewSummary, PreviewResult, PreviewStatusDot } from "./_custom-widget-preview-status";
import type { PreviewOutcome } from "./_custom-widget-preview-status";
import { PreviewActionControl } from "./_custom-widget-preview-action";
import { createPreviewDisplayData } from "./_custom-widget-preview-data";
import { CustomWidgetPreviewSizeControl } from "./_custom-widget-preview-size-control";
import { JsonPreviewEditor } from "./_json-preview-editor";
import classes from "./_custom-widget-form.module.css";

const previewWidths: Record<string, number> = { compact: 320, standard: 480, wide: 720 };

export interface PreviewState {
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; expiresAt: number; liveActions: boolean } | null;
  outcome: PreviewOutcome;
}

interface PreviewPanelProps {
  candidate: HomarrCustomWidgetV2 | null;
  validationIssues: Array<{ path?: string; message: string }>;
  preview: PreviewState;
  size: string;
  onSizeChange(value: string): void;
  optionsSnapshot: Record<string, unknown>;
  onOptionsChange(value: Record<string, unknown>): void;
  onLiveActionsChange(enabled: boolean): void;
}

function CustomWidgetPreviewPanelContent(props: PreviewPanelProps) {
  const t = useI18n("customWidget.workbench.preview");
  const errorBoundaryMessages = useI18n("customWidget.editor.errorBoundary");
  const actionT = useI18n("common.action");
  const [fixture, setFixture] = useState<"live" | "loading" | "empty" | "error">("live");
  const liveActionsMutation = clientApi.customWidget.setPreviewLiveActions.useMutation();
  const journalQuery = clientApi.customWidget.previewJournal.useQuery(
    { sessionId: props.preview.session?.id ?? "" },
    { enabled: Boolean(props.preview.session), refetchInterval: props.preview.session ? 2_000 : false },
  );
  const candidate = props.candidate;
  const candidateTemplate = candidate?.template;
  const candidateRequests = candidate?.requests;
  const previewCandidate = useMemo(() => {
    if (candidateTemplate === undefined || candidateRequests === undefined) return null;
    return { template: candidateTemplate, requests: candidateRequests };
  }, [candidateRequests, candidateTemplate]);
  const previewSnapshot = useMemo(
    () => ({ data: props.preview.data, status: props.preview.status, session: props.preview.session }),
    [props.preview.data, props.preview.session, props.preview.status],
  );
  const fixtureError = t("fixtureError");
  const accessibilityIssues = useMemo(() => {
    if (candidateTemplate === undefined) return [];
    return analyzeCustomWidgetAccessibility(candidateTemplate);
  }, [candidateTemplate]);
  const displayData = useMemo(
    () =>
      createPreviewDisplayData({
        candidate: previewCandidate,
        fixture,
        preview: previewSnapshot,
        options: props.optionsSnapshot,
        fixtureError,
      }),
    [fixture, fixtureError, previewCandidate, previewSnapshot, props.optionsSnapshot],
  );
  const previewSummary = useMemo(() => getPreviewSummary(props.preview.status), [props.preview.status]);
  const rendererResetKey = useMemo(
    () =>
      JSON.stringify({
        template: candidateTemplate,
        requests: candidateRequests,
        fixture,
        data: props.preview.data,
        status: props.preview.status,
        sessionId: props.preview.session?.id,
        options: props.optionsSnapshot,
      }),
    [
      candidateRequests,
      candidateTemplate,
      fixture,
      props.optionsSnapshot,
      props.preview.data,
      props.preview.session?.id,
      props.preview.status,
    ],
  );
  const previewResult =
    props.preview.outcome === "success"
      ? {
          title: t("result.success.title"),
          description: t("result.success.description", previewSummary),
        }
      : props.preview.outcome === "error"
        ? {
            title: t("result.error.title"),
            description: t("result.error.description", previewSummary),
          }
        : props.preview.outcome === "loading"
          ? { title: t("result.loading.title"), description: t("result.loading.description") }
          : { title: "", description: "" };

  return (
    <Card withBorder p="md">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <CustomWidgetPreviewSizeControl value={props.size} onChange={props.onSizeChange} />
          <SegmentedControl
            size="xs"
            value={fixture}
            disabled={!candidate}
            onChange={(value) => setFixture(value as typeof fixture)}
            data={[
              { value: "live", label: t("fixture.live") },
              { value: "loading", label: t("fixture.loading") },
              { value: "empty", label: t("fixture.empty") },
              { value: "error", label: t("fixture.error") },
            ]}
          />
        </Group>
        {candidate && (
          <PreviewResult
            outcome={props.preview.outcome}
            title={previewResult.title}
            description={previewResult.description}
          />
        )}
        <Tabs defaultValue="widget" keepMounted={false}>
          <Tabs.List grow>
            {(["widget", "data", "options", "actions", "diagnostics"] as const).map((tab) => (
              <Tabs.Tab key={tab} value={tab}>
                <Group gap={6} wrap="nowrap" justify="center">
                  {t(`tab.${tab}`)}
                  {tab === "data" && (
                    <PreviewStatusDot outcome={props.preview.outcome} label={t(`status.${props.preview.outcome}`)} />
                  )}
                </Group>
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="widget" pt="sm">
            <Box className={classes.previewCanvas}>
              <Paper
                withBorder
                p="sm"
                h={360}
                w={previewWidths[props.size] ?? 480}
                maw="100%"
                style={{ overflow: "auto" }}
              >
                {displayData ? (
                  <PreviewErrorBoundary
                    title={errorBoundaryMessages("title")}
                    description={t("containedFailures")}
                    retryLabel={actionT("tryAgain")}
                    resetKeys={[rendererResetKey]}
                  >
                    <CustomJsxDisplay data={displayData} />
                  </PreviewErrorBoundary>
                ) : (
                  <Alert color="yellow">{t("invalid")}</Alert>
                )}
              </Paper>
            </Box>
          </Tabs.Panel>
          <Tabs.Panel value="data" pt="sm">
            <CodeEditor
              id="preview-data"
              label={t("requestData")}
              language="json"
              value={JSON.stringify({ data: props.preview.data, status: props.preview.status }, null, 2)}
              readOnly
              onChange={() => undefined}
            />
          </Tabs.Panel>
          <Tabs.Panel value="options" pt="sm">
            <JsonPreviewEditor
              id="preview-options"
              label={t("instanceOptions")}
              value={props.optionsSnapshot}
              onChange={props.onOptionsChange}
            />
          </Tabs.Panel>
          <Tabs.Panel value="actions" pt="sm">
            <Stack gap="sm">
              <Switch
                label={t("liveActions")}
                description={t("liveActionsDescription")}
                checked={props.preview.session?.liveActions ?? false}
                disabled={!props.preview.session || liveActionsMutation.isPending}
                onChange={(event) => {
                  if (!props.preview.session) return;
                  const enabled = event.currentTarget.checked;
                  liveActionsMutation.mutate(
                    { sessionId: props.preview.session.id, enabled },
                    {
                      onSuccess: () => props.onLiveActionsChange(enabled),
                      onError: (error) => showErrorNotification({ title: t("liveActions"), message: error.message }),
                    },
                  );
                }}
              />
              {Object.entries(candidate?.requests ?? {})
                .filter(([, request]) => request.kind === "action")
                .map(([id, request]) => (
                  <PreviewActionControl key={id} request={{ id, ...request }} sessionId={props.preview.session?.id} />
                ))}
              {Object.values(candidate?.requests ?? {}).every((request) => request.kind !== "action") && (
                <Text size="sm" c="dimmed">
                  {t("noActions")}
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="diagnostics" pt="sm">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {t("containedFailures")}
              </Text>
              <Text size="sm" fw={600}>
                {t("validation.title")}
              </Text>
              {props.validationIssues.length === 0 ? (
                <Alert color="green">{t("validation.ready")}</Alert>
              ) : (
                props.validationIssues.map((issue, index) => (
                  <Alert key={`${issue.path ?? "widget"}-${index}`} color="red" title={issue.path}>
                    {issue.message}
                  </Alert>
                ))
              )}
              <Text size="sm" fw={600}>
                {t("accessibility.title")}
              </Text>
              {!candidate ? (
                <Alert color="gray">{t("accessibility.pending")}</Alert>
              ) : accessibilityIssues.length === 0 ? (
                <Alert color="green">{t("accessibility.ready")}</Alert>
              ) : (
                accessibilityIssues.map((issue) => (
                  <Alert key={issue} color="yellow">
                    {t(`accessibility.${issue}`)}
                  </Alert>
                ))
              )}
              {props.preview.session && (
                <CodeEditor
                  id="preview-journal"
                  label={t("journal")}
                  language="json"
                  value={JSON.stringify(journalQuery.data ?? [], null, 2)}
                  readOnly
                  onChange={() => undefined}
                />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}

export const CustomWidgetPreviewPanel = memo(CustomWidgetPreviewPanelContent);
