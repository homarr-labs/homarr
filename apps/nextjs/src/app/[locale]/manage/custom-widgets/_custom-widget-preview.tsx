"use client";

import { useMemo, useState } from "react";
import { Card, Stack, Tabs } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type {
  CustomWidgetAuthType,
  CustomWidgetDisplayType,
  CustomWidgetMethod,
  CustomWidgetSecretKind,
  DisplayConfig,
} from "@homarr/custom-widgets/core";
import { extractDisplayData } from "@homarr/custom-widgets/core";
import {
  analyzeJsxTemplate,
  getPreviewLegacyMethods,
  getPreviewNamedRequests,
  PreviewDiagnosticsPanel,
  PreviewErrorBoundary,
  PreviewHeader,
  PreviewRequestPanel,
  PreviewResponsePanel,
  redactPreviewUrl,
} from "@homarr/custom-widgets/workbench";
import { CUSTOM_JSX_METHOD_COLORS } from "@homarr/widgets/custom-api/custom-jsx-display";
import { useScopedI18n } from "@homarr/translation/client";

import { PreviewWidgetPanel } from "./_preview-widget-panel";

export interface PreviewInput {
  url: string;
  method: CustomWidgetMethod;
  authType: CustomWidgetAuthType;
  headerName?: string;
  requestBody?: string;
  displayType: CustomWidgetDisplayType;
  displayConfig: DisplayConfig;
  secrets: Array<{ kind: CustomWidgetSecretKind; value: string }>;
  definitionId?: string;
}

export interface PreviewFetchResult {
  success: boolean;
  error?: string;
  responseInfo: { status: number; statusText: string } | null;
  rawResponse: string | null;
  previewSession?: { id: string; expiresAt: number; liveActions: boolean } | null;
}

interface CustomWidgetPreviewProps {
  getFormValues: () => PreviewInput;
  formValues: PreviewInput;
  fetchResult: PreviewFetchResult | null;
  cachedJson: unknown;
  onTest: () => void;
  isTesting: boolean;
  isSampleStale?: boolean;
  testError?: string | null;
  onInsertDataPath?: (path: string) => void;
  onSetPreviewLiveActions?: (enabled: boolean) => void;
  isUpdatingPreviewActions?: boolean;
  onSampleDataChange?: (value: unknown) => void;
}

const methodColor = (method: string) => CUSTOM_JSX_METHOD_COLORS[method] ?? "gray";

export function CustomWidgetPreview(props: CustomWidgetPreviewProps) {
  const t = useScopedI18n("customWidget.preview");
  return (
    <PreviewErrorBoundary
      title={t("errorBoundary.title")}
      description={t("errorBoundary.description")}
      retryLabel={t("errorBoundary.retry")}
    >
      <CustomWidgetPreviewContent {...props} />
    </PreviewErrorBoundary>
  );
}

function CustomWidgetPreviewContent({
  getFormValues,
  formValues,
  fetchResult,
  cachedJson,
  onTest,
  isTesting,
  isSampleStale = false,
  testError,
  onInsertDataPath,
  onSetPreviewLiveActions,
  isUpdatingPreviewActions = false,
  onSampleDataChange,
}: CustomWidgetPreviewProps) {
  const t = useScopedI18n("customWidget");
  const editorT = useScopedI18n("customWidget.editor");
  const [previewSize, setPreviewSize] = useState("standard");
  const displayConfig = formValues.displayConfig as DisplayConfig & Record<string, unknown>;
  const previewSessionId = fetchResult?.previewSession?.id ?? "";
  const journalQuery = clientApi.customWidget.previewJournal.useQuery(
    { sessionId: previewSessionId },
    { enabled: previewSessionId.length > 0, retry: false, refetchInterval: 1_000 },
  );

  const displayData = useMemo((): Record<string, unknown> | null => {
    const { displayType } = formValues;
    if (displayType === "actionButton") {
      return extractDisplayData(null, displayType, displayConfig) as Record<string, unknown>;
    }
    if (!fetchResult?.success || cachedJson == null) return null;
    const extracted = extractDisplayData(cachedJson, displayType, displayConfig) as Record<string, unknown>;
    return displayType === "customJsx" && fetchResult.previewSession
      ? {
          ...extracted,
          previewSessionId: fetchResult.previewSession.id,
          previewLiveActions: fetchResult.previewSession.liveActions,
        }
      : extracted;
  }, [fetchResult, cachedJson, formValues, displayConfig]);

  const namedRequests = useMemo(() => getPreviewNamedRequests(displayConfig), [displayConfig]);
  const httpMethods = useMemo(() => {
    if (formValues.displayType !== "customJsx") return [];
    if (namedRequests.length > 0) return [...new Set(namedRequests.map((request) => request.method))];
    return getPreviewLegacyMethods((displayConfig.template as string) ?? "");
  }, [formValues.displayType, displayConfig.template, namedRequests]);
  const hasNamedActions = namedRequests.some((request) => request.kind === "action");
  const templateDiagnostics = useMemo(
    () =>
      formValues.displayType === "customJsx"
        ? analyzeJsxTemplate((displayConfig.template as string) ?? "", {
            apiVersion: displayConfig.jsxApiVersion === 2 ? 2 : 1,
            requestIds: namedRequests.map((request) => request.id),
          })
        : [],
    [displayConfig, formValues.displayType, namedRequests],
  );

  const handleTest = () => {
    const values = getFormValues();
    if (!values.url || values.method !== "GET") return;
    onTest();
  };

  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <PreviewHeader
          method={formValues.method}
          url={formValues.url}
          methods={httpMethods}
          hasNamedActions={hasNamedActions}
          hasPreviewSession={Boolean(fetchResult?.previewSession)}
          liveActions={fetchResult?.previewSession?.liveActions ?? false}
          isUpdatingLiveActions={isUpdatingPreviewActions}
          isTesting={isTesting}
          isSampleStale={isSampleStale}
          testError={testError}
          responseError={fetchResult?.success === false ? fetchResult.error : undefined}
          responseStatus={fetchResult?.success === false ? fetchResult.responseInfo : undefined}
          onTest={handleTest}
          onSetLiveActions={onSetPreviewLiveActions}
          methodColor={methodColor}
          messages={{
            title: t("preview.title"),
            interactive: t("preview.capabilities.interactive"),
            capabilitiesTitle: t("preview.capabilities.title"),
            capabilitiesDescription: t("preview.capabilities.description"),
            liveActions: t("preview.capabilities.liveActions"),
            liveActionsDescription: t("preview.capabilities.liveActionsDescription"),
            runTestFirst: t("preview.capabilities.runTestFirst"),
            simulated: t("preview.capabilities.simulated"),
            test: t("preview.test"),
            mutationDisabled: t("preview.mutationDisabled"),
            staleTitle: t("preview.stale.title"),
            staleDescription: t("preview.stale.description"),
          }}
        />

        <Tabs defaultValue="widget" keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="widget">{t("preview.tab.widget")}</Tabs.Tab>
            <Tabs.Tab value="response">{t("preview.tab.response")}</Tabs.Tab>
            <Tabs.Tab value="request">{t("preview.tab.request")}</Tabs.Tab>
            <Tabs.Tab value="diagnostics">{t("preview.tab.diagnostics")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="widget" pt="sm">
            <PreviewWidgetPanel
              data={displayData}
              displayType={formValues.displayType}
              success={fetchResult?.success ?? false}
              responseInfo={fetchResult?.responseInfo ?? null}
              previewSize={previewSize}
              onPreviewSizeChange={setPreviewSize}
            />
          </Tabs.Panel>

          <Tabs.Panel value="response" pt="sm">
            <PreviewResponsePanel
              value={cachedJson}
              rawResponse={fetchResult?.rawResponse}
              onInsertDataPath={onInsertDataPath}
              onSampleDataChange={onSampleDataChange}
              messages={{
                empty: t("preview.response.empty"),
                sampleHint: t("preview.response.sampleHint"),
                editSample: t("preview.response.editSample"),
                addSample: t("preview.response.addSample"),
                copied: t("preview.response.copied"),
                copy: t("preview.response.copy"),
                sampleLabel: t("preview.response.sampleLabel"),
                sampleDescription: t("preview.response.sampleDescription"),
                invalidSample: t("preview.response.invalidSample"),
                cancelSample: t("preview.response.cancelSample"),
                applySample: t("preview.response.applySample"),
                copyPath: t("preview.response.copyPath"),
                pathCopied: t("preview.response.pathCopied"),
                insertPath: t("preview.response.insertPath"),
                openRaw: t("preview.rawResponse"),
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="request" pt="sm">
            <PreviewRequestPanel
              method={formValues.method}
              authentication={formValues.authType}
              endpoint={redactPreviewUrl(formValues.url)}
              status={fetchResult?.responseInfo?.status}
              namedRequests={namedRequests}
              journal={journalQuery.data}
              methodColor={methodColor}
              messages={{
                method: t("preview.request.method"),
                authentication: t("preview.request.authentication"),
                endpoint: t("preview.request.endpoint"),
                status: t("preview.request.status"),
                notRun: t("preview.request.notRun"),
                named: t("preview.request.named", { count: namedRequests.length }),
                journal: t("preview.request.journal"),
                journalEmpty: t("preview.request.journalEmpty"),
                simulated: t("preview.request.simulated"),
                redacted: t("preview.request.redacted"),
                permission: (permission) => t(`preview.request.permission.${permission}` as never),
                duration: (duration) => t("preview.request.duration", { duration }),
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="diagnostics" pt="sm">
            <PreviewDiagnosticsPanel
              templateLength={(displayConfig.template as string | undefined)?.length ?? 0}
              namedRequestCount={namedRequests.length}
              methods={httpMethods.join(", ") || "GET"}
              networkScope={(displayConfig.networkScope as string | undefined) ?? t("preview.diagnostics.legacy")}
              diagnostics={templateDiagnostics}
              messages={{
                templateSize: t("preview.diagnostics.templateSize"),
                characters: (count) => t("preview.diagnostics.characters", { count }),
                namedRequests: t("preview.diagnostics.namedRequests"),
                methods: t("preview.diagnostics.methods"),
                networkScope: t("preview.diagnostics.networkScope"),
                ready: t("preview.diagnostics.ready"),
                diagnostic: (diagnostic) =>
                  `${diagnostic.line ? `${editorT("diagnostics.line", { line: diagnostic.line })}: ` : ""}${editorT(
                    `diagnostics.${diagnostic.code}` as never,
                    { value: diagnostic.value ?? "" } as never,
                  )}`,
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}
