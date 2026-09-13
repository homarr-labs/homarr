"use client";

import { useMemo } from "react";
import { Alert, Group, Stack, Switch, Tabs, Text } from "@mantine/core";
import { analyzeCustomWidgetAccessibility } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";
import type { PreviewPanelProps } from "./_flow/preview-panel-types";
import { PreviewRequestData } from "./_flow/preview-request-data";
import { WorkbenchRequestJournal } from "./_flow/request-journal";
import { PreviewStatusDot } from "./_custom-widget-preview-status";
import { PreviewActionControl } from "./_custom-widget-preview-action";
import { JsonPreviewEditor } from "./_json-preview-editor";

export function PreviewTabList({
  outcome,
  widgetLabel,
}: {
  outcome: PreviewPanelProps["preview"]["outcome"];
  widgetLabel?: string;
}) {
  const t = useI18n("customWidget.workbench.preview");
  const flowT = useI18n("customWidget.flow");
  return (
    <Tabs.List grow>
      {(["widget", "data", "options", "actions", "diagnostics"] as const).map((tab) => (
        <Tabs.Tab key={tab} value={tab}>
          <Group gap={6} wrap="nowrap" justify="center">
            {tab === "widget" && widgetLabel ? widgetLabel : t(`tab.${tab}`)}
            {tab === "data" && <PreviewStatusDot outcome={outcome} label={t(`status.${outcome}`)} />}
          </Group>
        </Tabs.Tab>
      ))}
      <Tabs.Tab value="journal">{flowT("requestJournal")}</Tabs.Tab>
    </Tabs.List>
  );
}

export function PreviewDetailPanels(
  props: PreviewPanelProps & {
    requestId?: string;
    onShowAll(): void;
    liveActions: { pending: boolean; toggle(enabled: boolean): void };
  },
) {
  const t = useI18n("customWidget.workbench.preview");
  const candidate = props.candidate;
  const candidateTemplate = candidate?.template;
  const accessibilityIssues = useMemo(() => {
    if (candidateTemplate === undefined) return [];
    return analyzeCustomWidgetAccessibility(candidateTemplate);
  }, [candidateTemplate]);
  return (
    <>
      <Tabs.Panel value="data" pt="sm">
        <PreviewRequestData preview={props.preview} requestId={props.requestId} onShowAll={props.onShowAll} />
      </Tabs.Panel>
      <Tabs.Panel value="journal" pt="sm">
        <WorkbenchRequestJournal />
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
            disabled={!props.preview.session || props.liveActions.pending}
            onChange={(event) => props.liveActions.toggle(event.currentTarget.checked)}
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
        </Stack>
      </Tabs.Panel>
    </>
  );
}
