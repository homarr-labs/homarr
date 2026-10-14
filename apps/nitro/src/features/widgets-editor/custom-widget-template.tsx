import { useRef, useState } from "react";
import { Alert, Button, Code, Group, Skeleton, Stack } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { CodeEditor } from "../../source-ui/widgets-editor/code-editor";
import { CustomWidgetWorkbenchProvider } from "../../source-ui/widgets-editor/workbench-context";

import type { EditorOutputs, EditorTranslate, WidgetEditorClient, WidgetEditorQueryUtils } from "./contracts";

export function CustomWidgetTemplate(props: {
  definitionId: string;
  isAdmin: boolean;
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  saveAvailable?: boolean;
  t: EditorTranslate;
  onSaved(result: EditorOutputs["customWidget"]["templatePatch"]): void;
}) {
  const queries = props.queryUtils;
  const query = useQuery(
    queries.customWidget.readTemplate.queryOptions({
      input: { id: props.definitionId },
      enabled: props.isAdmin,
      retry: false,
    }),
  );
  if (!props.isAdmin) return <Alert color="yellow">{props.t("nitro.widgetEditor.adminPermissionRequired")}</Alert>;
  if (query.isPending) return <Skeleton h={320} />;
  if (!query.data)
    return (
      <Alert color="red">
        <Button variant="subtle" onClick={() => void query.refetch()}>
          {props.t("common.action.tryAgain")}
        </Button>
      </Alert>
    );
  return <TemplateSession key={query.data.id} {...props} initial={query.data} />;
}

export type CustomWidgetTemplateProps = Parameters<typeof CustomWidgetTemplate>[0];

function TemplateSession(
  props: Parameters<typeof CustomWidgetTemplate>[0] & { initial: EditorOutputs["customWidget"]["readTemplate"] },
) {
  const [template, setTemplate] = useState(props.initial.template);
  const [baseline, setBaseline] = useState(props.initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<EditorOutputs["customWidget"]["validateTemplate"] | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const queryClient = useQueryClient();
  const queries = props.queryUtils;
  const validate = async () => {
    if (lock.current || !props.isAdmin) return;
    const current = generation.current;
    lock.current = true;
    setPending(true);
    try {
      const result = await props.client.customWidget.validateTemplate({ templateLines: template.split("\n") });
      if (current === generation.current) setDiagnostics(result);
    } catch {
      setError(props.t("customWidget.notification.previewError"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const save = async () => {
    if (lock.current || !props.isAdmin || !props.saveAvailable) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await props.client.customWidget.templatePatch({
        id: props.definitionId,
        expectedRevision: baseline.revision,
        edits: [{ startLine: 1, deleteCount: baseline.templateLines.length, replacementLines: template.split("\n") }],
      });
      const saved = { ...baseline, ...result };
      setBaseline(saved);
      setTemplate(result.template);
      queryClient.setQueryData(
        queries.customWidget.readTemplate.queryKey({ input: { id: props.definitionId } }),
        saved,
      );
      props.onSaved(result);
    } catch {
      setError(props.t("nitro.widgetEditor.templateConflictOrSaveFailed"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <CustomWidgetWorkbenchProvider t={props.t} CodeEditor={CustomWidgetCodeEditor} integrations={[]}>
      <Stack gap="sm">
        {!props.saveAvailable && <Alert color="yellow">{props.t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <CodeEditor
          id="custom-widget-template"
          language="jsx"
          label={props.t("customWidget.workbench.section.template")}
          value={template}
          height="400px"
          maxLength={50000}
          readOnly={pending || !props.isAdmin}
          onChange={(value) => {
            generation.current += 1;
            setTemplate(value);
            setDiagnostics(null);
          }}
        />
        {diagnostics && (
          <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(diagnostics, null, 2)}
          </Code>
        )}
        <Group justify="flex-end">
          <Button variant="default" loading={pending} disabled={!props.isAdmin} onClick={() => void validate()}>
            {props.t("nitro.widgetEditor.validateTemplate")}
          </Button>
          <Button
            loading={pending}
            disabled={!props.isAdmin || !props.saveAvailable || template === baseline.template}
            onClick={() => void save()}
          >
            {props.t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </CustomWidgetWorkbenchProvider>
  );
}
