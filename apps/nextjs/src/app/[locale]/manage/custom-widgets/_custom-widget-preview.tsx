"use client";

import { Component as ReactComponent, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Code,
  Collapse,
  CopyButton,
  getTreeExpandedState,
  Group,
  Loader,
  Paper,
  Popover,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  Title,
  Tree,
  useTree,
} from "@mantine/core";
import type { RenderTreeNodePayload, TreeNodeData } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClipboard,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconInfoCircle,
  IconNetwork,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { CUSTOM_JSX_METHOD_COLORS } from "@homarr/widgets/custom-api/custom-jsx-display";
import { useScopedI18n } from "@homarr/translation/client";
import { displayComponents } from "@homarr/widgets/custom-api/component";
import { extractDisplayData } from "@homarr/widgets/custom-api/extract-display-data";

import { analyzeJsxTemplate } from "./_code-editor";

interface PreviewInput {
  url: string;
  method: string;
  authType: string;
  headerName?: string;
  requestBody?: string;
  displayType: string;
  displayConfig: Record<string, unknown>;
  secrets: Array<{ kind: string; value: string }>;
  definitionId?: string;
}

interface NamedRequestSummary {
  id: string;
  kind: "query" | "action";
  method: string;
  pathTemplate: string;
  minimumBoardPermission?: string;
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

function journalEntryColor(entry: { simulated: boolean; status: number | null }): string {
  if (entry.simulated) return "yellow";
  if (entry.status !== null && entry.status >= 200 && entry.status < 400) return "green";
  return "red";
}

const redactUrl = (value: string) => {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) url.searchParams.set(key, "redacted");
    return url.toString();
  } catch {
    return value;
  }
};

const getNamedRequests = (displayConfig: Record<string, unknown>): NamedRequestSummary[] => {
  if (!Array.isArray(displayConfig.requests)) return [];
  return displayConfig.requests.filter(
    (request): request is NamedRequestSummary =>
      request !== null &&
      typeof request === "object" &&
      "id" in request &&
      typeof request.id === "string" &&
      "kind" in request &&
      (request.kind === "query" || request.kind === "action") &&
      "method" in request &&
      typeof request.method === "string" &&
      "pathTemplate" in request &&
      typeof request.pathTemplate === "string",
  );
};

const getLegacyMethods = (template: string) => {
  const methods = new Set<string>();
  for (const match of template.matchAll(/<(?:SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/giu)) {
    const method = match[1]?.match(/\bmethod\s*=\s*["'](GET|POST|PUT|PATCH|DELETE)["']/iu)?.[1];
    const defaultMethod = match[0].startsWith("<SubFetch") ? "GET" : "POST";
    methods.add(method?.toUpperCase() ?? defaultMethod);
  }
  return [...methods];
};

interface PreviewErrorBoundaryProps {
  children: ReactNode;
  title: string;
  description: string;
  retryLabel: string;
}

interface PreviewErrorBoundaryState {
  hasError: boolean;
}

class PreviewErrorBoundary extends ReactComponent<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  state: PreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The renderer exposes redacted diagnostics. Avoid logging imported template data here.
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Card p="xl" role="alert">
        <Stack align="center" gap="sm" py="xl">
          <IconAlertTriangle size={28} color="var(--mantine-color-red-6)" />
          <div>
            <Text fw={600} ta="center">
              {this.props.title}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={480}>
              {this.props.description}
            </Text>
          </div>
          <Button variant="light" onClick={() => this.setState({ hasError: false })}>
            {this.props.retryLabel}
          </Button>
        </Stack>
      </Card>
    );
  }
}

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
  const [sampleEditorOpen, setSampleEditorOpen] = useState(false);
  const [sampleDraft, setSampleDraft] = useState("");
  const previewSessionId = fetchResult?.previewSession?.id ?? "";
  const journalQuery = clientApi.customWidget.previewJournal.useQuery(
    { sessionId: previewSessionId },
    { enabled: previewSessionId.length > 0, retry: false, refetchInterval: 1_000 },
  );

  const displayData = useMemo((): Record<string, unknown> | null => {
    const { displayType, displayConfig } = formValues;
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
  }, [fetchResult, cachedJson, formValues]);

  const namedRequests = useMemo(() => getNamedRequests(formValues.displayConfig), [formValues.displayConfig]);
  const httpMethods = useMemo(() => {
    if (formValues.displayType !== "customJsx") return [];
    if (namedRequests.length > 0) return [...new Set(namedRequests.map((request) => request.method))];
    return getLegacyMethods((formValues.displayConfig.template as string) ?? "");
  }, [formValues.displayType, formValues.displayConfig.template, namedRequests]);
  const hasNamedActions = namedRequests.some((request) => request.kind === "action");
  const templateDiagnostics = useMemo(
    () =>
      formValues.displayType === "customJsx"
        ? analyzeJsxTemplate((formValues.displayConfig.template as string) ?? "", {
            apiVersion: formValues.displayConfig.jsxApiVersion === 2 ? 2 : 1,
            requestIds: namedRequests.map((request) => request.id),
          })
        : [],
    [formValues.displayConfig, formValues.displayType, namedRequests],
  );

  const handleTest = () => {
    const values = getFormValues();
    if (!values.url || values.method !== "GET") return;
    onTest();
  };

  const PREVIEW_HEIGHTS: Record<string, number> = { compact: 240, standard: 360, wide: 520 };
  const previewHeight = PREVIEW_HEIGHTS[previewSize] ?? 360;
  const responseJson = cachedJson == null ? "" : JSON.stringify(cachedJson, null, 2);
  const sampleError = useMemo(() => {
    if (!sampleDraft.trim()) return null;
    try {
      JSON.parse(sampleDraft);
      return null;
    } catch {
      return t("preview.response.invalidSample");
    }
  }, [sampleDraft, t]);

  useEffect(() => {
    if (!sampleEditorOpen) setSampleDraft(responseJson);
  }, [responseJson, sampleEditorOpen]);

  const openSampleEditor = () => {
    setSampleDraft(responseJson || JSON.stringify({ name: "Sample service", status: "online", value: 42 }, null, 2));
    setSampleEditorOpen(true);
  };

  const applySampleData = () => {
    if (!sampleDraft.trim() || sampleError) return;
    onSampleDataChange?.(JSON.parse(sampleDraft) as unknown);
    setSampleEditorOpen(false);
  };

  return (
    <Card withBorder p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Title order={5}>{t("preview.title")}</Title>
            {httpMethods.length > 0 && (
              <Popover width={300} position="bottom" withinPortal shadow="md">
                <Popover.Target>
                  <Button size="compact-xs" variant="subtle" color="gray" leftSection={<IconNetwork size={14} />}>
                    {t("preview.capabilities.interactive")}
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      {t("preview.capabilities.title")}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t("preview.capabilities.description")}
                    </Text>
                    <Group gap={4}>
                      {httpMethods.map((method) => (
                        <Badge key={method} size="xs" color={methodColor(method)} variant="light">
                          {method}
                        </Badge>
                      ))}
                    </Group>
                    {hasNamedActions && (
                      <Stack gap={4} mt="xs">
                        <Switch
                          label={t("preview.capabilities.liveActions")}
                          description={
                            fetchResult?.previewSession
                              ? t("preview.capabilities.liveActionsDescription")
                              : t("preview.capabilities.runTestFirst")
                          }
                          checked={fetchResult?.previewSession?.liveActions ?? false}
                          disabled={
                            !fetchResult?.previewSession || !onSetPreviewLiveActions || isUpdatingPreviewActions
                          }
                          onChange={(event) => onSetPreviewLiveActions?.(event.currentTarget.checked)}
                        />
                        {!fetchResult?.previewSession?.liveActions && (
                          <Badge size="xs" color="yellow" variant="light" style={{ alignSelf: "flex-start" }}>
                            {t("preview.capabilities.simulated")}
                          </Badge>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            )}
          </Group>
          <Button
            size="xs"
            variant="light"
            leftSection={isTesting ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
            onClick={handleTest}
            loading={isTesting}
            disabled={formValues.method !== "GET" || !formValues.url}
          >
            {t("preview.test")}
          </Button>
        </Group>

        {formValues.method !== "GET" && (
          <Alert color="yellow" variant="light" p="xs" icon={<IconInfoCircle size={15} />}>
            <Text size="xs">{t("preview.mutationDisabled")}</Text>
          </Alert>
        )}
        {isSampleStale && (
          <Alert color="yellow" variant="light" p="xs" icon={<IconAlertTriangle size={15} />}>
            <Text size="xs" fw={600}>
              {t("preview.stale.title")}
            </Text>
            <Text size="xs">{t("preview.stale.description")}</Text>
          </Alert>
        )}
        {testError && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">{testError}</Text>
          </Alert>
        )}
        {fetchResult && !fetchResult.success && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs" fw={500}>
              {fetchResult.error}
            </Text>
            {fetchResult.responseInfo && (
              <Badge size="xs" color="red" variant="light" mt={4}>
                {fetchResult.responseInfo.status} {fetchResult.responseInfo.statusText}
              </Badge>
            )}
          </Alert>
        )}

        <Tabs defaultValue="widget" keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="widget">{t("preview.tab.widget")}</Tabs.Tab>
            <Tabs.Tab value="response">{t("preview.tab.response")}</Tabs.Tab>
            <Tabs.Tab value="request">{t("preview.tab.request")}</Tabs.Tab>
            <Tabs.Tab value="diagnostics">{t("preview.tab.diagnostics")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="widget" pt="sm">
            <Stack gap="xs">
              <SegmentedControl
                size="xs"
                fullWidth
                value={previewSize}
                onChange={setPreviewSize}
                data={(["compact", "standard", "wide"] as const).map((value) => ({
                  value,
                  label: t(`preview.size.${value}` as never),
                }))}
              />
              {displayData && (formValues.displayType === "actionButton" || fetchResult?.success) ? (
                <>
                  {fetchResult?.success && (
                    <Badge
                      size="xs"
                      color={fetchResult.responseInfo ? "green" : "gray"}
                      variant="light"
                      style={{ alignSelf: "flex-start" }}
                    >
                      {fetchResult.responseInfo
                        ? `${fetchResult.responseInfo.status} ${fetchResult.responseInfo.statusText}`
                        : t("preview.response.localSample")}
                    </Badge>
                  )}
                  <Paper withBorder p="xs" h={previewHeight} style={{ overflow: "auto" }}>
                    <PreviewDisplay data={displayData} />
                  </Paper>
                </>
              ) : (
                <Center h={previewHeight}>
                  <Stack gap={4} align="center" maw={280}>
                    <IconPlayerPlay size={22} color="var(--mantine-color-dimmed)" />
                    <Text size="sm" fw={500} ta="center">
                      {t("preview.empty.title")}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {t("preview.hint")}
                    </Text>
                  </Stack>
                </Center>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="response" pt="sm">
            <Stack gap="xs">
              <Group justify="space-between" wrap="wrap">
                <Text size="xs" c="dimmed">
                  {responseJson ? t("preview.response.sampleHint") : t("preview.response.empty")}
                </Text>
                <Group gap={4}>
                  {onSampleDataChange && (
                    <Button size="compact-xs" variant="light" onClick={openSampleEditor}>
                      {responseJson ? t("preview.response.editSample") : t("preview.response.addSample")}
                    </Button>
                  )}
                  {responseJson && (
                    <CopyButton value={responseJson}>
                      {({ copied, copy }) => (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          onClick={copy}
                        >
                          {copied ? t("preview.response.copied") : t("preview.response.copy")}
                        </Button>
                      )}
                    </CopyButton>
                  )}
                </Group>
              </Group>
              <Collapse expanded={sampleEditorOpen}>
                <Paper p="sm" bg="var(--mantine-color-default-hover)">
                  <Stack gap="sm">
                    <Textarea
                      label={t("preview.response.sampleLabel")}
                      description={t("preview.response.sampleDescription")}
                      value={sampleDraft}
                      onChange={(event) => setSampleDraft(event.currentTarget.value)}
                      error={sampleError}
                      autosize
                      minRows={8}
                      maxRows={18}
                      styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                    />
                    <Group justify="flex-end">
                      <Button variant="default" size="xs" onClick={() => setSampleEditorOpen(false)}>
                        {t("preview.response.cancelSample")}
                      </Button>
                      <Button
                        size="xs"
                        onClick={applySampleData}
                        disabled={!sampleDraft.trim() || Boolean(sampleError)}
                      >
                        {t("preview.response.applySample")}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              </Collapse>
              {responseJson ? (
                <>
                  <ScrollArea h={360} type="auto">
                    <ResponseTree value={cachedJson} onInsertDataPath={onInsertDataPath} />
                  </ScrollArea>
                  {fetchResult?.rawResponse && (
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconExternalLink size={14} />}
                      onClick={() => {
                        const blob = new Blob([fetchResult.rawResponse ?? ""], { type: "application/json" });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                      }}
                    >
                      {t("preview.rawResponse")}
                    </Button>
                  )}
                </>
              ) : (
                <EmptyPreview icon={<IconCode size={22} />} text={t("preview.response.empty")} />
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="request" pt="sm">
            <Stack gap="sm">
              <SimpleGrid cols={2} spacing="xs">
                <RequestFact label={t("preview.request.method")} value={formValues.method} />
                <RequestFact label={t("preview.request.authentication")} value={formValues.authType} />
                <RequestFact label={t("preview.request.endpoint")} value={redactUrl(formValues.url)} />
                <RequestFact
                  label={t("preview.request.status")}
                  value={
                    fetchResult?.responseInfo ? String(fetchResult.responseInfo.status) : t("preview.request.notRun")
                  }
                />
              </SimpleGrid>
              {namedRequests.length > 0 && (
                <Stack gap={6}>
                  <Text size="xs" fw={600}>
                    {t("preview.request.named", { count: namedRequests.length })}
                  </Text>
                  {namedRequests.map((request) => (
                    <Paper key={request.id} withBorder p="xs">
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text size="xs" fw={600} ff="monospace">
                            {request.id}
                          </Text>
                          <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                            {request.pathTemplate}
                          </Text>
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <Badge size="xs" variant="light" color={methodColor(request.method)}>
                            {request.method}
                          </Badge>
                          <Badge size="xs" variant="light" color="gray">
                            {t(`preview.request.permission.${request.minimumBoardPermission ?? "view"}` as never)}
                          </Badge>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
              {journalQuery.data && journalQuery.data.length > 0 ? (
                <Stack gap={6}>
                  <Text size="xs" fw={600}>
                    {t("preview.request.journal")}
                  </Text>
                  {journalQuery.data.map((entry) => (
                    <Paper key={entry.id} withBorder p="xs">
                      <Group justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text size="xs" fw={600} ff="monospace">
                            {entry.requestId}
                          </Text>
                          <Text size="xs" c="dimmed" ff="monospace" truncate>
                            {entry.pathTemplate}
                          </Text>
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <Badge size="xs" color={methodColor(entry.method)} variant="light">
                            {entry.method}
                          </Badge>
                          <Badge size="xs" color={journalEntryColor(entry)}>
                            {entry.simulated ? t("preview.request.simulated") : (entry.status ?? "—")}
                          </Badge>
                          <Text size="xs" c="dimmed" w={56} ta="right">
                            {t("preview.request.duration", { duration: entry.durationMs })}
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed">
                  {t("preview.request.journalEmpty")}
                </Text>
              )}
              <Alert color="blue" variant="light" p="xs" icon={<IconClipboard size={15} />}>
                <Text size="xs">{t("preview.request.redacted")}</Text>
              </Alert>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="diagnostics" pt="sm">
            <Stack gap="xs">
              <SimpleGrid cols={2} spacing="xs">
                <RequestFact
                  label={t("preview.diagnostics.templateSize")}
                  value={t("preview.diagnostics.characters", {
                    count: (formValues.displayConfig.template as string | undefined)?.length ?? 0,
                  })}
                />
                <RequestFact label={t("preview.diagnostics.namedRequests")} value={String(namedRequests.length)} />
                <RequestFact label={t("preview.diagnostics.methods")} value={httpMethods.join(", ") || "GET"} />
                <RequestFact
                  label={t("preview.diagnostics.networkScope")}
                  value={
                    (formValues.displayConfig.networkScope as string | undefined) ?? t("preview.diagnostics.legacy")
                  }
                />
              </SimpleGrid>
              {templateDiagnostics.length === 0 ? (
                <Alert color="green" variant="light" p="xs" icon={<IconCheck size={15} />}>
                  <Text size="xs">{t("preview.diagnostics.ready")}</Text>
                </Alert>
              ) : (
                templateDiagnostics.map((diagnostic, index) => (
                  <Alert
                    key={`${diagnostic.code}-${index}`}
                    color={{ error: "red", warning: "yellow" }[diagnostic.severity] ?? "yellow"}
                    variant="light"
                    p="xs"
                    icon={<IconAlertTriangle size={15} />}
                  >
                    <Text size="xs">
                      {diagnostic.line ? `${editorT("diagnostics.line", { line: diagnostic.line })}: ` : ""}
                      {editorT(`diagnostics.${diagnostic.code}` as never, { value: diagnostic.value ?? "" } as never)}
                    </Text>
                  </Alert>
                ))
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}

function ResponseTree({ value, onInsertDataPath }: { value: unknown; onInsertDataPath?: (path: string) => void }) {
  const t = useScopedI18n("customWidget");
  const data = useMemo(() => [createResponseTreeNode(value, "data", "data")], [value]);
  const tree = useTree({ initialExpandedState: getTreeExpandedState(data, ["data"]) });
  return (
    <Tree
      data={data}
      tree={tree}
      levelOffset={14}
      expandOnClick
      selectOnClick={false}
      renderNode={(payload) => (
        <ResponseTreeNode
          {...payload}
          onInsertDataPath={onInsertDataPath}
          copyLabel={t("preview.response.copyPath")}
          copiedLabel={t("preview.response.pathCopied")}
          insertLabel={t("preview.response.insertPath")}
        />
      )}
    />
  );
}

interface ResponseTreeData extends TreeNodeData {
  path: string;
  displayValue: string;
}

function collectionDisplayValue(value: unknown, count: number): string {
  if (Array.isArray(value)) return `[${count}]`;
  return `{${count}}`;
}

function createResponseTreeNode(value: unknown, path: string, label: string): ResponseTreeData {
  const isCollection = value !== null && typeof value === "object";
  const entries = isCollection ? Object.entries(value as Record<string, unknown>) : [];
  return {
    value: path,
    label,
    path,
    displayValue: isCollection ? collectionDisplayValue(value, entries.length) : formatTreeValue(value),
    children: entries.map(([key, childValue]) =>
      createResponseTreeNode(childValue, appendDataPath(path, key, Array.isArray(value)), key),
    ),
  };
}

function ResponseTreeNode({
  node,
  expanded,
  hasChildren,
  elementProps,
  onInsertDataPath,
  copyLabel,
  copiedLabel,
  insertLabel,
}: RenderTreeNodePayload & {
  onInsertDataPath?: (path: string) => void;
  copyLabel: string;
  copiedLabel: string;
  insertLabel: string;
}) {
  const responseNode = node as ResponseTreeData;
  return (
    <Group {...elementProps} gap={4} wrap="nowrap" mih={28} className="response-tree-row">
      <div style={{ width: 16, flexShrink: 0 }}>
        {hasChildren && (expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />)}
      </div>
      <Code style={{ flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis", fontSize: 11 }}>
        {responseNode.label}
      </Code>
      <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
        {responseNode.displayValue}
      </Text>
      <Group gap={2} wrap="nowrap" className="response-tree-actions">
        <CopyButton value={responseNode.path}>
          {({ copied, copy }) => (
            <ActionIcon
              variant="subtle"
              color={copied ? "green" : "gray"}
              size={24}
              aria-label={copied ? copiedLabel : copyLabel}
              onClick={(event) => {
                event.stopPropagation();
                copy();
              }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          )}
        </CopyButton>
        {onInsertDataPath && (
          <ActionIcon
            variant="subtle"
            size={24}
            aria-label={insertLabel}
            onClick={(event) => {
              event.stopPropagation();
              onInsertDataPath(responseNode.path);
            }}
          >
            <IconPlus size={14} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  );
}

function appendDataPath(parent: string, key: string, isArray: boolean) {
  if (isArray) return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/u.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function formatTreeValue(value: unknown) {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  return String(value);
}

function EmptyPreview({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Center h={240}>
      <Stack align="center" gap="xs" c="dimmed">
        {icon}
        <Text size="xs" ta="center">
          {text}
        </Text>
      </Stack>
    </Center>
  );
}

function RequestFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="xs">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xs" fw={600} lineClamp={2}>
        {value || "—"}
      </Text>
    </Paper>
  );
}

function PreviewDisplay({ data }: { data: unknown }) {
  const t = useScopedI18n("customWidget");
  const typed = data as Record<string, unknown>;
  if (!typed || typeof typed !== "object") return null;

  const dataType = typed.type as string | undefined;
  if (dataType === "actionButton") {
    return (
      <Center p="sm" h="100%">
        <Button size="sm" color={(typed.buttonColor as string) ?? "blue"} disabled>
          {(typed.buttonLabel as string) ?? t("preview.execute")}
        </Button>
      </Center>
    );
  }

  const Component = dataType ? displayComponents[dataType] : undefined;
  if (Component) return <Component data={typed} />;

  return (
    <ScrollArea h="100%">
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
