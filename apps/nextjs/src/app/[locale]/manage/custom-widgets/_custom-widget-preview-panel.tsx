"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Card,
  Group,
  MantineProvider,
  Paper,
  SegmentedControl,
  Stack,
  Switch,
  Tabs,
  Text,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { analyzeCustomWidgetAccessibility } from "@homarr/custom-widgets/workbench";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";

import { CodeEditor } from "./_code-editor";
import { isRecord, parseJson } from "./_custom-widget-form-utils";
import { PreviewActionControl } from "./_custom-widget-preview-action";
import classes from "./_custom-widget-form.module.css";

export interface PreviewState {
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  session: { id: string; expiresAt: number; liveActions: boolean } | null;
}

interface PreviewPanelProps {
  candidate: HomarrCustomWidgetV2 | null;
  preview: PreviewState;
  size: string;
  onSizeChange(value: string): void;
  theme: "light" | "dark";
  onThemeChange(value: "light" | "dark"): void;
  optionsSnapshot: Record<string, unknown>;
  onOptionsChange(value: Record<string, unknown>): void;
  onLiveActionsChange(enabled: boolean): void;
}

export function CustomWidgetPreviewPanel(props: PreviewPanelProps) {
  const t = useScopedI18n("customWidget.workbench.preview");
  const [fixture, setFixture] = useState<"live" | "loading" | "empty" | "error">("live");
  const liveActionsMutation = clientApi.customWidget.setPreviewLiveActions.useMutation();
  const journalQuery = clientApi.customWidget.previewJournal.useQuery(
    { sessionId: props.preview.session?.id ?? "" },
    { enabled: Boolean(props.preview.session), refetchInterval: props.preview.session ? 2_000 : false },
  );
  const widths: Record<string, number> = { compact: 320, standard: 480, wide: 720 };
  if (!props.candidate) return <Alert color="yellow">{t("invalid")}</Alert>;
  const candidate = props.candidate;
  const accessibilityIssues = analyzeCustomWidgetAccessibility(candidate.template);
  const fixtureData =
    fixture === "empty" ? Object.fromEntries(candidate.requests.map((entry) => [entry.id, []])) : props.preview.data;
  const fixtureStatus =
    fixture === "loading"
      ? Object.fromEntries(candidate.requests.map((entry) => [entry.id, { loading: true }]))
      : fixture === "error"
        ? Object.fromEntries(
            candidate.requests.map((entry) => [entry.id, { loading: false, ok: false, error: t("fixtureError") }]),
          )
        : props.preview.status;
  const displayData = {
    template: candidate.template,
    data: fixtureData,
    status: fixtureStatus,
    options: props.optionsSnapshot,
    requestCapabilities: candidate.requests.map(
      ({ id, kind, method, trigger, minimumBoardPermission, confirmation, invalidates }) => ({
        id,
        kind,
        method,
        trigger,
        minimumBoardPermission,
        confirmation,
        invalidates,
      }),
    ),
    previewSessionId: props.preview.session?.id,
    previewLiveActions: props.preview.session?.liveActions ?? false,
    queriesDisabled: fixture !== "live",
    isEditMode: fixture !== "live",
  };

  return (
    <Card withBorder p="md">
      <Stack gap="md">
        <Group grow>
          <SegmentedControl
            size="xs"
            value={props.size}
            onChange={props.onSizeChange}
            data={[
              { value: "compact", label: t("size.compact") },
              { value: "standard", label: t("size.standard") },
              { value: "wide", label: t("size.wide") },
            ]}
          />
          <SegmentedControl
            size="xs"
            value={props.theme}
            onChange={(value) => props.onThemeChange(value as "light" | "dark")}
            data={[
              { value: "light", label: t("theme.light") },
              { value: "dark", label: t("theme.dark") },
            ]}
          />
        </Group>
        <SegmentedControl
          size="xs"
          value={fixture}
          onChange={(value) => setFixture(value as typeof fixture)}
          data={[
            { value: "live", label: t("fixture.live") },
            { value: "loading", label: t("fixture.loading") },
            { value: "empty", label: t("fixture.empty") },
            { value: "error", label: t("fixture.error") },
          ]}
        />
        <Tabs defaultValue="widget" keepMounted={false}>
          <Tabs.List grow>
            {(["widget", "data", "options", "actions", "diagnostics"] as const).map((tab) => (
              <Tabs.Tab key={tab} value={tab}>
                {t(`tab.${tab}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="widget" pt="sm">
            <Box className={classes.previewCanvas}>
              <MantineProvider forceColorScheme={props.theme}>
                <Paper withBorder p="sm" h={360} w={widths[props.size] ?? 480} maw="100%" style={{ overflow: "auto" }}>
                  <CustomJsxDisplay data={displayData} />
                </Paper>
              </MantineProvider>
            </Box>
          </Tabs.Panel>
          <Tabs.Panel value="data" pt="sm">
            <CodeEditor
              id="preview-data"
              label={t("requestData")}
              language="json"
              value={JSON.stringify({ data: props.preview.data, status: props.preview.status }, null, 2)}
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
              {candidate.requests
                .filter((request) => request.kind === "action")
                .map((request) => (
                  <PreviewActionControl
                    key={request.id}
                    request={request}
                    sessionId={props.preview.session?.id}
                    options={props.optionsSnapshot}
                  />
                ))}
              {candidate.requests.every((request) => request.kind !== "action") && (
                <Text size="sm" c="dimmed">
                  {t("noActions")}
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="diagnostics" pt="sm">
            <Stack gap="xs">
              {props.preview.session ? (
                <Badge color="green">{t("sessionActive")}</Badge>
              ) : (
                <Badge color="gray">{t("simulationPending")}</Badge>
              )}
              <Text size="sm" c="dimmed">
                {t("containedFailures")}
              </Text>
              <Text size="sm" fw={600}>
                {t("accessibility.title")}
              </Text>
              {accessibilityIssues.length === 0 ? (
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

function JsonPreviewEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: Record<string, unknown>;
  onChange(value: Record<string, unknown>): void;
}) {
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <CodeEditor
      id={id}
      label={label}
      language="json"
      value={draft}
      onChange={(next) => {
        setDraft(next);
        const parsed = parseJson(next);
        if (isRecord(parsed)) onChange(parsed);
      }}
    />
  );
}
