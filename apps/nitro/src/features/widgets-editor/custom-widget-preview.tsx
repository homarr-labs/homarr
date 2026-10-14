import { useRef, useState } from "react";
import { Alert, Badge, Box, Button, Code, Group, Modal, Paper, Stack, Switch, Tabs, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { CustomWidgetPreviewSizeControl } from "@homarr/ui/source-views/custom-workbench";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { CodeEditor } from "../../source-ui/widgets-editor/code-editor";
import { CustomWidgetWorkbenchProvider } from "../../source-ui/widgets-editor/workbench-context";

import type {
  EditorInputs,
  CustomWidgetEditorCapabilities,
  EditorTranslate,
  WidgetEditorBindings,
  WidgetEditorClient,
  WidgetEditorDomain,
  WidgetEditorQueryUtils,
} from "./contracts";
import type { CustomPreviewState } from "./custom-widget-authoring";

const runtimeParams = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const previewWidths: Record<string, number> = { compact: 320, standard: 480, wide: 720 };

export function CustomWidgetPreview(props: {
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  domain: WidgetEditorDomain;
  bindings: WidgetEditorBindings;
  isAdmin: boolean;
  capabilities?: CustomWidgetEditorCapabilities;
  preview: CustomPreviewState | null;
  pending: boolean;
  t: EditorTranslate;
  onPreviewChange(value: CustomPreviewState | null): void;
  onOptionsChange(value: Record<string, unknown>): void;
  onSaveTested(): void;
}) {
  const { t, preview, client } = props;
  const queries = props.queryUtils;
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<
    EditorInputs["customWidget"]["previewAction"] | "enable-live" | null
  >(null);
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [...(preview?.created.queries ?? []), ...(preview?.created.actions ?? [])].map((entry) => [
        entry.requestId,
        JSON.stringify(Object.fromEntries(entry.parameterNames.map((name) => [name, ""])), null, 2),
      ]),
    ),
  );
  const [width, setWidth] = useState("standard");
  const [optionsDraft, setOptionsDraft] = useState(() => JSON.stringify(preview?.options ?? {}, null, 2));
  const lock = useRef(false);
  const currentSession = useRef(preview?.created.previewSession.id);
  currentSession.current = preview?.created.previewSession.id;
  const sessionId = preview?.created.previewSession.id;
  const journal = useQuery(
    queries.customWidget.previewJournal.queryOptions({
      input: { sessionId: sessionId ?? "" },
      enabled: Boolean(sessionId) && props.isAdmin && props.capabilities?.preview === true,
      retry: false,
    }),
  );
  const request = async (
    kind: "query" | "action",
    requestId: string,
    parameterNames: string[],
    captured?: EditorInputs["customWidget"]["previewAction"],
  ) => {
    if (lock.current || !preview || !props.isAdmin || props.pending || !props.capabilities?.preview) return;
    if (kind === "action" && preview.created.previewSession.liveActions && !props.capabilities.liveActions) return;
    const id = preview.created.previewSession.id;
    if (captured && (captured.sessionId !== id || captured.requestId !== requestId)) return;
    let parsed: Record<string, string | number | boolean>;
    try {
      const raw: unknown = captured ? captured.params : JSON.parse(params[requestId] ?? "{}");
      parsed = runtimeParams.parse(raw);
      const names = Object.keys(parsed).toSorted();
      const expected = parameterNames.toSorted();
      if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
        setError(t("nitro.widgetEditor.previewParameterMismatch"));
        return;
      }
    } catch {
      setError(t("nitro.widgetEditor.previewParameterMismatch"));
      return;
    }
    const action = preview.created.actions.find((entry) => entry.requestId === requestId);
    if (kind === "action" && (action?.confirmation || action?.method === "DELETE") && !captured) {
      setConfirmation({ sessionId: id, requestId, params: parsed });
      return;
    }
    lock.current = true;
    setPendingRequest(requestId);
    setError(null);
    try {
      const result =
        kind === "query"
          ? await client.customWidget.previewQuery({ sessionId: id, requestId, params: parsed })
          : await client.customWidget.previewAction({
              sessionId: id,
              requestId,
              params: parsed,
              confirmed: captured ? true : undefined,
            });
      if (currentSession.current !== id) return;
      props.onPreviewChange({
        ...preview,
        data: { ...preview.data, [requestId]: result.data },
        status: { ...preview.status, [requestId]: { ...result, loading: false } },
      });
      setConfirmation(null);
      void journal.refetch();
    } catch {
      if (currentSession.current === id) setError(t("customWidget.notification.previewError"));
    } finally {
      lock.current = false;
      setPendingRequest(null);
    }
  };
  const setLive = async (enabled: boolean) => {
    if (!preview || lock.current || !props.isAdmin || props.pending || !props.capabilities?.liveActions) return;
    const id = preview.created.previewSession.id;
    lock.current = true;
    setPendingRequest("live-actions");
    setError(null);
    try {
      const result = await client.customWidget.setPreviewLiveActions({ sessionId: id, enabled });
      if (currentSession.current !== id) return;
      props.onPreviewChange({
        ...preview,
        created: {
          ...preview.created,
          previewSession: { ...preview.created.previewSession, liveActions: result.liveActions },
        },
      });
      setConfirmation(null);
    } catch {
      if (currentSession.current === id) setError(t("customWidget.notification.previewError"));
    } finally {
      lock.current = false;
      setPendingRequest(null);
    }
  };
  const renderRequests = (kind: "query" | "action") => {
    if (!preview) return null;
    const entries = kind === "query" ? preview.created.queries : preview.created.actions;
    return (
      <Stack gap="md">
        {entries.map((entry) => (
          <Paper key={entry.requestId} withBorder p="sm">
            <Stack gap="sm">
              <Group justify="space-between">
                <Code>{entry.requestId}</Code>
                {"method" in entry && <Badge variant="light">{entry.method}</Badge>}
              </Group>
              {"minimumBoardPermission" in entry && (
                <Text size="xs">
                  {t("nitro.widgetEditor.minimumBoardPermission", { permission: entry.minimumBoardPermission })}
                </Text>
              )}
              {"invalidates" in entry && entry.invalidates.length > 0 && (
                <Text size="xs">{t("nitro.widgetEditor.invalidates", { requests: entry.invalidates.join(", ") })}</Text>
              )}
              {entry.parameterNames.length > 0 && (
                <CodeEditor
                  id={`preview-params-${entry.requestId}`}
                  language="json"
                  label={t("nitro.widgetEditor.requestParameters")}
                  description={entry.parameterNames.join(", ")}
                  value={params[entry.requestId] ?? "{}"}
                  onChange={(value) => setParams((current) => ({ ...current, [entry.requestId]: value }))}
                  readOnly={pendingRequest !== null || props.pending}
                  height="140px"
                />
              )}
              <Button
                variant="light"
                loading={pendingRequest === entry.requestId}
                disabled={
                  !props.isAdmin ||
                  pendingRequest !== null ||
                  props.pending ||
                  !props.capabilities?.preview ||
                  (kind === "action" && preview.created.previewSession.liveActions && !props.capabilities.liveActions)
                }
                onClick={() => void request(kind, entry.requestId, entry.parameterNames)}
              >
                {t(
                  kind === "query"
                    ? "nitro.widgetEditor.runQuery"
                    : preview.created.previewSession.liveActions
                      ? "nitro.widgetEditor.runLiveAction"
                      : "nitro.widgetEditor.simulateAction",
                )}
              </Button>
              {preview.status[entry.requestId] !== undefined && (
                <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {JSON.stringify(preview.status[entry.requestId], null, 2)}
                </Code>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  };
  const Renderer = props.bindings.CustomJsxRenderer;
  const components = props.bindings.customJsxComponents;
  const createBindings = props.bindings.customJsxBindings;
  const confirmedAction =
    confirmation && confirmation !== "enable-live"
      ? preview?.created.actions.find(({ requestId }) => requestId === confirmation.requestId)
      : undefined;
  const actionConfirmation = confirmedAction?.confirmation;
  return (
    <CustomWidgetWorkbenchProvider
      t={t}
      CodeEditor={props.bindings.CodeEditor ?? CustomWidgetCodeEditor}
      integrations={[]}
    >
      <Paper withBorder p="md">
        <Stack gap="md">
          {(!props.capabilities?.save || !props.capabilities.preview || !props.capabilities.liveActions) && (
            <Alert color="yellow">
              {props.capabilities?.unavailableReason ?? t("nitro.widgetEditor.draftWriterUnavailable")}
            </Alert>
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {!preview ? (
            <Alert color="gray">{t("nitro.widgetEditor.previewRequired")}</Alert>
          ) : (
            <>
              <Group justify="space-between">
                <CustomWidgetPreviewSizeControl
                  value={width}
                  onChange={setWidth}
                  copy={{
                    compact: t("customWidget.workbench.preview.size.compact"),
                    standard: t("customWidget.workbench.preview.size.standard"),
                    wide: t("customWidget.workbench.preview.size.wide"),
                  }}
                />
                <Badge variant="light">
                  {t("nitro.widgetEditor.previewRevision", { revision: preview.created.previewSession.revision })}
                </Badge>
              </Group>
              <Tabs defaultValue="widget" keepMounted={false}>
                <Tabs.List grow>
                  {["widget", "data", "options", "queries", "actions", "journal"].map((tab) => (
                    <Tabs.Tab key={tab} value={tab}>
                      {t(`customWidget.workbench.preview.tab.${tab}`)}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
                <Tabs.Panel value="widget" pt="sm">
                  <Box w={previewWidths[width] ?? 480} maw="100%" mih={360} style={{ overflow: "auto" }}>
                    {Renderer && components && createBindings ? (
                      <Renderer
                        template={preview.definition.template}
                        data={preview.data}
                        status={preview.status}
                        options={preview.options}
                        components={components}
                        createBindings={createBindings}
                        messages={{
                          noTemplate: t("nitro.widgetEditor.noTemplate"),
                          templateWarnings: (count) => t("nitro.widgetEditor.templateWarnings", { count }),
                          bindingTypeConflict: (name, firstType, secondType) =>
                            t("nitro.widgetEditor.bindingTypeConflict", { name, firstType, secondType }),
                        }}
                      />
                    ) : (
                      <Alert color="yellow">{t("nitro.widgetEditor.rendererUnavailable")}</Alert>
                    )}
                  </Box>
                </Tabs.Panel>
                <Tabs.Panel value="data" pt="sm">
                  <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {JSON.stringify(preview.data, null, 2)}
                  </Code>
                </Tabs.Panel>
                <Tabs.Panel value="options" pt="sm">
                  <CodeEditor
                    id="preview-options"
                    language="json"
                    label={t("customWidget.workbench.section.options")}
                    value={optionsDraft}
                    onChange={setOptionsDraft}
                    height="200px"
                  />
                  <Button
                    mt="sm"
                    disabled={props.pending || pendingRequest !== null}
                    onClick={() => {
                      try {
                        const raw: unknown = JSON.parse(optionsDraft);
                        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
                        const value = raw as Record<string, unknown>;
                        const issues = props.domain.validateCustomWidgetOptions(preview.definition.options, value);
                        if (issues.length) {
                          setError(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
                          return;
                        }
                        props.onOptionsChange(value);
                      } catch {
                        setError(t("customWidget.workbench.invalidWidget"));
                      }
                    }}
                  >
                    {t("nitro.widgetEditor.applyPreviewOptions")}
                  </Button>
                </Tabs.Panel>
                <Tabs.Panel value="queries" pt="sm">
                  {renderRequests("query")}
                </Tabs.Panel>
                <Tabs.Panel value="actions" pt="sm">
                  <Stack>
                    <Switch
                      label={t("nitro.widgetEditor.livePreviewActions")}
                      checked={preview.created.previewSession.liveActions}
                      disabled={
                        !props.isAdmin || pendingRequest !== null || props.pending || !props.capabilities?.liveActions
                      }
                      onChange={(event) => {
                        if (event.currentTarget.checked) setConfirmation("enable-live");
                        else void setLive(false);
                      }}
                    />
                    {renderRequests("action")}
                  </Stack>
                </Tabs.Panel>
                <Tabs.Panel value="journal" pt="sm">
                  <Stack>
                    <Button variant="subtle" loading={journal.isFetching} onClick={() => void journal.refetch()}>
                      {t("common.action.refresh")}
                    </Button>
                    {journal.isError && <Alert color="red">{t("customWidget.notification.previewError")}</Alert>}
                    <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {JSON.stringify(journal.data ?? [], null, 2)}
                    </Code>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
              {preview.created.sourceConfigurations.length > 0 && (
                <Alert color="yellow">
                  {t("nitro.widgetEditor.previewSourceConfigurationRequired", {
                    sources: preview.created.sourceConfigurations.map(({ sourceId }) => sourceId).join(", "),
                  })}
                </Alert>
              )}
              <Button
                disabled={props.pending || pendingRequest !== null || !props.isAdmin || !props.capabilities?.save}
                onClick={props.onSaveTested}
              >
                {t("nitro.widgetEditor.saveTestedPreview")}
              </Button>
            </>
          )}
          <Modal
            opened={confirmation !== null}
            onClose={() => !pendingRequest && setConfirmation(null)}
            title={
              actionConfirmation?.title ??
              (confirmation === "enable-live"
                ? t("nitro.widgetEditor.enableLiveActionsTitle")
                : confirmedAction?.requestId)
            }
            closeOnClickOutside={false}
            closeButtonProps={{ disabled: pendingRequest !== null }}
          >
            <Stack>
              <Text>
                {actionConfirmation?.message ??
                  (confirmation === "enable-live"
                    ? t("nitro.widgetEditor.enableLiveActionsDescription")
                    : t("customWidget.workbench.preview.deleteConfirmation"))}
              </Text>
              {confirmation !== "enable-live" && confirmation && <Code>{confirmation.requestId}</Code>}
              <Group justify="flex-end">
                <Button variant="default" disabled={pendingRequest !== null} onClick={() => setConfirmation(null)}>
                  {t("common.action.cancel")}
                </Button>
                <Button
                  color={
                    confirmation === "enable-live" ||
                    actionConfirmation?.destructive ||
                    confirmedAction?.method === "DELETE"
                      ? "red"
                      : undefined
                  }
                  loading={pendingRequest !== null}
                  disabled={
                    props.pending ||
                    !props.isAdmin ||
                    !props.capabilities?.preview ||
                    (confirmation === "enable-live" && !props.capabilities.liveActions) ||
                    (confirmation !== "enable-live" && !confirmedAction)
                  }
                  onClick={() => {
                    if (confirmation === "enable-live") void setLive(true);
                    else if (confirmation && preview) {
                      const action = preview.created.actions.find(
                        ({ requestId }) => requestId === confirmation.requestId,
                      );
                      if (action) void request("action", action.requestId, action.parameterNames, confirmation);
                    }
                  }}
                >
                  {actionConfirmation?.confirmLabel ?? t("common.action.confirm")}
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Paper>
    </CustomWidgetWorkbenchProvider>
  );
}

export type CustomWidgetPreviewProps = Parameters<typeof CustomWidgetPreview>[0];
