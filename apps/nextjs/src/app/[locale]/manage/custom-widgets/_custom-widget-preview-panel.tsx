"use client";

import { memo, useMemo, useState, useRef, useEffect } from "react";
import { Box, Card, Group, Stack, Tabs, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { WorkbenchPreviewWidget, workbenchPreviewWidth } from "./_flow/preview-widget";
import { WorkbenchPreviewControls, WorkbenchPreviewTools } from "./_flow/preview-controls";
import { useWorkbenchPreviewPresentation } from "./_flow/preview-presentation";
import { WorkbenchPreviewThemeControl } from "./_flow/preview-theme";
import type { PreviewPanelProps, PreviewFixture } from "./_flow/preview-panel-types";
import { usePreviewExecution } from "./_flow/preview-execution";
import { usePreviewLiveActions } from "./_flow/preview-live-actions";
import { getPreviewSummary, PreviewResult, PreviewStatusDot } from "./_custom-widget-preview-status";
import { PreviewDetailPanels, PreviewTabList } from "./_custom-widget-preview-details";
import { createPreviewDisplayData } from "./_custom-widget-preview-data";
import classes from "./_custom-widget-form.module.css";

export type { PreviewState } from "./_flow/preview-state";

function CustomWidgetPreviewPanelContent(props: PreviewPanelProps) {
  const t = useI18n("customWidget.workbench.preview");
  const [inspect, setInspect] = useState(false);
  const [fixture, setFixture] = useState<PreviewFixture>("live");
  const execution = usePreviewExecution();
  const liveActions = usePreviewLiveActions(props);
  const presentation = useWorkbenchPreviewPresentation();
  const canvas = presentation === "canvas";
  const lastValid = useRef(props.candidate);
  useEffect(() => {
    if (props.candidate) lastValid.current = props.candidate;
  }, [props.candidate]);
  const candidate = props.candidate ?? lastValid.current;
  const flowT = useI18n("customWidget.flow");
  const candidateExtensions = candidate?.extensions;
  const candidateTemplate = candidate?.template;
  const candidateRequests = candidate?.requests;
  const hasActions =
    Object.values(candidateRequests ?? {}).some((request) => request.kind === "action") ||
    Object.values(candidateExtensions?.native ?? {}).some((capability) => capability.kind === "action");
  const previewCandidate = useMemo(() => {
    if (candidateTemplate === undefined || candidateRequests === undefined) return null;
    return { template: candidateTemplate, requests: candidateRequests, extensions: candidateExtensions };
  }, [candidateRequests, candidateTemplate, candidateExtensions]);
  const previewSnapshot = useMemo(
    () => ({ data: props.preview.data, status: props.preview.status, session: props.preview.session }),
    [props.preview.data, props.preview.session, props.preview.status],
  );
  const fixtureError = t("fixtureError");
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
        extensions: candidateExtensions,
        fixture,
        data: props.preview.data,
        status: props.preview.status,
        sessionId: props.preview.session?.id,
        options: props.optionsSnapshot,
      }),
    [
      candidateRequests,
      candidateTemplate,
      candidateExtensions,
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

  const controls = (
    <WorkbenchPreviewControls
      size={props.size}
      onSizeChange={props.onSizeChange}
      inspect={inspect}
      onInspectChange={setInspect}
      fixture={fixture}
      onFixtureChange={setFixture}
      disabled={!candidate}
    />
  );
  const result = candidate && (
    <PreviewResult
      outcome={props.preview.outcome}
      title={previewResult.title}
      description={previewResult.description}
    />
  );
  const details = (
    <PreviewDetailPanels
      {...props}
      candidate={candidate}
      requestId={execution.requestId}
      onShowAll={execution.showAll}
      liveActions={liveActions}
    />
  );

  return (
    <Card
      withBorder={!canvas}
      p={canvas ? 0 : "xs"}
      w={canvas ? workbenchPreviewWidth(props.size) : undefined}
      data-preview-presentation={presentation}
      className="nodrag nopan nowheel"
    >
      <Stack gap="xs">
        {(props.preview.stale || !props.candidate) && (
          <Text size="xs" c="dimmed" component="output">
            {flowT("stalePreview")}
          </Text>
        )}
        {canvas && (
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              <PreviewStatusDot outcome={props.preview.outcome} label={t(`status.${props.preview.outcome}`)} />
              {hasActions && (
                <Text size="xs" c="dimmed">
                  {props.preview.session?.liveActions ? t("liveActions") : flowT("previewActionsSimulated")}
                </Text>
              )}
            </Group>
            <WorkbenchPreviewTools revealVersion={execution.revealVersion}>
              <Tabs
                value={execution.activeTab}
                onChange={execution.setActiveTab}
                keepMounted
                keepMountedMode="display-none"
              >
                <PreviewTabList outcome={props.preview.outcome} widgetLabel={flowT("previewDisplay")} />
                <Tabs.Panel value="widget" pt="sm">
                  <Stack gap="sm">
                    {controls}
                    <WorkbenchPreviewThemeControl />
                    {result}
                  </Stack>
                </Tabs.Panel>
                {details}
              </Tabs>
            </WorkbenchPreviewTools>
          </Group>
        )}
        {!canvas && controls}
        {!canvas && result}
        <Tabs
          value={canvas ? "widget" : execution.activeTab}
          onChange={execution.setActiveTab}
          keepMounted
          keepMountedMode="display-none"
        >
          {!canvas && <PreviewTabList outcome={props.preview.outcome} />}
          <Tabs.Panel
            key="widget-renderer"
            value="widget"
            pt={canvas ? 0 : "sm"}
            renderRoot={(attributes) => {
              if (canvas) {
                const canvasAttributes = { ...attributes };
                delete canvasAttributes.role;
                delete canvasAttributes["aria-labelledby"];
                return <section {...canvasAttributes} aria-label={t("tab.widget")} />;
              }
              return <section {...attributes} />;
            }}
          >
            <Box
              className={classes.previewCanvas}
              style={canvas ? { padding: 0, background: "none", overflow: "visible" } : undefined}
            >
              <WorkbenchPreviewWidget
                data={displayData}
                size={props.size}
                inspect={inspect}
                resetKey={rendererResetKey}
              />
            </Box>
          </Tabs.Panel>
          {!canvas && details}
        </Tabs>
      </Stack>
    </Card>
  );
}

export const CustomWidgetPreviewPanel = memo(CustomWidgetPreviewPanelContent);
