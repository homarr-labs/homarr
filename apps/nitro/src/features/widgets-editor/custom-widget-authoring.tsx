import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Group, Modal, SegmentedControl, Stack, Text, Textarea } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { CustomWidgetSaveIssuesAlert } from "@homarr/ui/source-views/custom-workbench";

import type {
  CustomDefinition,
  CustomFormValues,
  CustomWidgetEditorCapabilities,
  EditorInputs,
  EditorIntegration,
  EditorOutputs,
  EditorTranslate,
  PreviewCreated,
  WidgetEditorBindings,
  WidgetEditorClient,
  WidgetEditorDomain,
  WidgetEditorQueryUtils,
} from "./contracts";
import { extractSaveIssues, issueMessages } from "./validation";
import { CustomWidgetPreview } from "./custom-widget-preview";
import { StructuredCustomWidgetWorkbench } from "../../source-ui/widgets-editor/structured-workbench";
import { CustomWidgetWorkbenchProvider } from "../../source-ui/widgets-editor/workbench-context";
import classes from "./widget-editor.module.css";

export interface CustomPreviewState {
  definition: CustomDefinition;
  created: Omit<PreviewCreated, "previewSession"> & {
    previewSession: Omit<PreviewCreated["previewSession"], "liveActions"> & { liveActions: boolean };
  };
  generation: number;
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  options: Record<string, unknown>;
}

export interface CustomWidgetAuthoringProps {
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  domain: WidgetEditorDomain;
  bindings: WidgetEditorBindings;
  isAdmin: boolean;
  definitionId?: string;
  initialValues?: Partial<CustomFormValues>;
  integrationData?: readonly EditorIntegration[];
  integrationsPending?: boolean;
  integrationsError?: string;
  capabilities?: CustomWidgetEditorCapabilities;
  t: EditorTranslate;
  onSaved(result: EditorOutputs["customWidget"]["create"] | EditorOutputs["customWidget"]["update"]): void;
  onDirtyChange?(dirty: boolean): void;
}

export function CustomWidgetAuthoring(props: CustomWidgetAuthoringProps) {
  const { domain, t, client } = props;
  const queryClient = useQueryClient();
  const queries = props.queryUtils;
  const [values, setValues] = useState<CustomFormValues>(() => ({
    ...structuredClone(domain.defaultCustomWidgetFormValues),
    ...props.initialValues,
  }));
  const [baseline, setBaseline] = useState(values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<CustomPreviewState | null>(null);
  const [optionsSnapshot, setOptionsSnapshot] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<"preview" | "save" | null>(null);
  const [mobilePane, setMobilePane] = useState("configure");
  const [paste, setPaste] = useState("");
  const [pasteOpened, setPasteOpened] = useState(false);
  const [discardOpened, setDiscardOpened] = useState(false);
  const [revision, setRevision] = useState(0);
  const [clearingSecret, setClearingSecret] = useState(false);
  const generation = useRef(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  const currentValues = useRef(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const capabilities = props.capabilities;
  const unavailableReason = capabilities?.unavailableReason ?? t("nitro.widgetEditor.draftWriterUnavailable");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, []);
  const notifyDirty = props.onDirtyChange;
  useEffect(() => notifyDirty?.(dirty), [dirty, notifyDirty]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const candidate = useMemo(() => {
    try {
      const sources: unknown = JSON.parse(values.sources);
      const requests: unknown = JSON.parse(values.requests);
      const options: unknown = JSON.parse(values.options);
      return domain.customWidgetDefinitionSchema.safeParse({
        $schema: "homarr-custom-widget-v2",
        name: values.name,
        description: values.description || undefined,
        iconUrl: values.iconUrl || undefined,
        sources,
        requests,
        options,
        template: values.template,
      });
    } catch {
      return null;
    }
  }, [domain, values]);
  const requirements = candidate?.success ? domain.getCustomWidgetSecretRequirements(candidate.data.sources) : [];
  const change = (patch: Partial<CustomFormValues>) => {
    if (!props.isAdmin || pending === "save" || clearingSecret) return;
    generation.current += 1;
    const next = { ...currentValues.current, ...patch };
    currentValues.current = next;
    setValues(next);
    setPreview(null);
    setError(null);
    setErrors({});
  };
  const changedSecrets = (): NonNullable<EditorInputs["customWidget"]["previewCreate"]["secrets"]> =>
    values.secrets.flatMap((secret) => {
      const { kind } = secret;
      if (!secret.value.trim() || (kind !== "apiKey" && kind !== "username" && kind !== "password")) return [];
      if (!requirements.some((required) => required.sourceId === secret.sourceId && required.kind === kind)) return [];
      return [{ sourceId: secret.sourceId, kind, value: secret.value }];
    });
  const validate = (): CustomDefinition | null => {
    const form = domain.customWidgetFormSchema.safeParse(values);
    if (!form.success) {
      setErrors(issueMessages(form.error.issues));
      return null;
    }
    if (!candidate?.success) {
      setErrors(
        candidate ? issueMessages(candidate.error.issues) : { sources: t("customWidget.workbench.invalidWidget") },
      );
      return null;
    }
    return candidate.data;
  };
  const runPreview = async () => {
    if (lock.current || clearingSecret || !props.isAdmin || !capabilities?.preview) return;
    const definition = validate();
    if (!definition) return;
    const options = { ...domain.getCustomWidgetDefaultOptions(definition.options), ...optionsSnapshot };
    const issues = domain.validateCustomWidgetOptions(definition.options, options);
    if (issues.length) {
      setErrors(Object.fromEntries(issues.map((issue) => [issue.path, issue.message])));
      return;
    }
    lock.current = true;
    setPending("preview");
    setError(null);
    setPreview(null);
    setMobilePane("preview");
    const current = ++generation.current;
    try {
      const created = await client.customWidget.previewCreate({
        definition,
        definitionId: props.definitionId,
        secrets: changedSecrets(),
        options,
      });
      if (!mounted.current || generation.current !== current) return;
      const snapshot: CustomPreviewState = { definition, created, generation: current, data: {}, status: {}, options };
      const loads = created.queries.filter((query) => query.trigger === "load");
      let nextIndex = 0;
      const worker = async () => {
        while (generation.current === current && mounted.current) {
          const query = loads[nextIndex++];
          if (!query) return;
          try {
            const result = await client.customWidget.previewQuery({
              sessionId: created.previewSession.id,
              requestId: query.requestId,
              params: {},
            });
            if (generation.current !== current || !mounted.current) return;
            snapshot.data[query.requestId] = result.data;
            snapshot.status[query.requestId] = { ...result, loading: false };
          } catch {
            if (generation.current !== current || !mounted.current) return;
            snapshot.status[query.requestId] = {
              ok: false,
              loading: false,
              error: t("customWidget.notification.previewError"),
            };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, loads.length) }, worker));
      if (generation.current === current && mounted.current) setPreview(snapshot);
    } catch (cause) {
      if (generation.current !== current || !mounted.current) return;
      setErrors(extractSaveIssues(cause));
      setError(t("customWidget.notification.previewError"));
    } finally {
      lock.current = false;
      if (mounted.current) setPending(null);
    }
  };
  const save = async (testedPreview: boolean) => {
    if (lock.current || clearingSecret || !props.isAdmin || !capabilities?.save) return;
    const definition = validate();
    if (!definition) return;
    if (testedPreview && (!preview || preview.generation !== generation.current)) {
      setError(t("nitro.widgetEditor.previewStale"));
      return;
    }
    lock.current = true;
    setPending("save");
    setError(null);
    setErrors({});
    const submitted = structuredClone(values);
    try {
      let result: EditorOutputs["customWidget"]["create"] | EditorOutputs["customWidget"]["update"];
      if (testedPreview && preview) {
        if (props.definitionId)
          result = await client.customWidget.updateFromPreview({ previewSessionId: preview.created.previewSession.id });
        else
          result = await client.customWidget.createFromPreview({ previewSessionId: preview.created.previewSession.id });
      } else {
        const secrets = changedSecrets();
        if (props.definitionId)
          result = await client.customWidget.update({
            id: props.definitionId,
            ...definition,
            secrets: secrets.length ? secrets : undefined,
          });
        else result = await client.customWidget.create({ ...definition, secrets });
      }
      const saved = {
        ...submitted,
        secrets: submitted.secrets.map((secret) => ({
          ...secret,
          value: "",
          hasValue: secret.hasValue || Boolean(secret.value.trim()),
        })),
      };
      if (mounted.current) {
        currentValues.current = saved;
        setValues(saved);
        setBaseline(saved);
        setPreview(null);
        setRevision((value) => value + 1);
      }
      void queryClient.invalidateQueries({ queryKey: queries.customWidget.key() });
      props.onSaved(result);
    } catch (cause) {
      if (mounted.current) {
        setErrors(extractSaveIssues(cause));
        setError(t("customWidget.notification.updateError"));
      }
    } finally {
      lock.current = false;
      if (mounted.current) setPending(null);
    }
  };
  const CodeEditor = props.bindings.CodeEditor ?? CustomWidgetCodeEditor;
  const workbenchBindings = {
    t,
    CodeEditor,
    integrations: props.integrationData ?? [],
    integrationsPending: props.integrationsPending,
    integrationsError: props.integrationsError,
    clearSecretPending: clearingSecret,
    clearSecret:
      capabilities?.clearSecret && props.definitionId
        ? async (sourceId: string, kind: "apiKey" | "username" | "password") => {
            if (lock.current || clearingSecret || !props.isAdmin || !props.definitionId)
              throw new Error(unavailableReason);
            lock.current = true;
            generation.current += 1;
            setPreview(null);
            setClearingSecret(true);
            try {
              await client.customWidget.secretClear({ definitionId: props.definitionId, sourceId, kind });
              await queryClient.invalidateQueries({
                queryKey: queries.customWidget.get.queryKey({ input: { id: props.definitionId } }),
              });
            } finally {
              lock.current = false;
              if (mounted.current) setClearingSecret(false);
            }
          }
        : undefined,
  };
  return (
    <CustomWidgetWorkbenchProvider {...workbenchBindings}>
      <Stack gap="md">
        {!props.isAdmin && <Alert color="yellow">{t("nitro.widgetEditor.adminPermissionRequired")}</Alert>}
        {(!capabilities?.save || !capabilities.preview) && <Alert color="yellow">{unavailableReason}</Alert>}
        {error && <Alert color="red">{error}</Alert>}
        {warnings.map((warning, index) => (
          <Alert key={`${index}:${warning}`} color="yellow">
            {warning}
          </Alert>
        ))}
        <CustomWidgetSaveIssuesAlert
          issues={Object.entries(errors).map(([path, message]) => ({ path, message }))}
          copy={{
            title: t("customWidget.workbench.saveError.title"),
            description: t("customWidget.workbench.saveError.description"),
            errors: t("customWidget.workbench.saveError.errors"),
            copied: t("customWidget.workbench.saveError.copied"),
            copy: t("customWidget.workbench.saveError.copy"),
          }}
        />
        <SegmentedControl
          value={mobilePane}
          onChange={setMobilePane}
          data={[
            { value: "configure", label: t("customWidget.workbench.configure") },
            { value: "preview", label: t("customWidget.workbench.section.preview") },
          ]}
        />
        <Group justify="flex-end">
          <Button
            type="button"
            variant="default"
            onClick={() => setPasteOpened(true)}
            disabled={!props.isAdmin || pending !== null || clearingSecret}
          >
            {t("customWidget.workbench.ai.response")}
          </Button>
          <Button
            type="button"
            variant="default"
            loading={pending === "preview"}
            disabled={!props.isAdmin || pending !== null || clearingSecret || !capabilities?.preview}
            onClick={() => void runPreview()}
          >
            {t("customWidget.workbench.section.preview")}
          </Button>
          <Button
            type="button"
            disabled={!props.isAdmin || pending !== null || clearingSecret || !capabilities?.save}
            loading={pending === "save"}
            onClick={() => void save(false)}
          >
            {t(props.definitionId ? "common.action.saveChanges" : "common.action.create")}
          </Button>
          {dirty && (
            <Button
              type="button"
              variant="default"
              disabled={pending !== null || clearingSecret}
              onClick={() => setDiscardOpened(true)}
            >
              {t("common.action.discard")}
            </Button>
          )}
        </Group>
        <div className={classes.workbench} data-mobile-pane={mobilePane}>
          <StructuredCustomWidgetWorkbench
            {...workbenchBindings}
            values={values}
            errors={errors}
            definitionId={props.definitionId}
            disabled={!props.isAdmin || pending === "save" || clearingSecret}
            IconPicker={props.bindings.IconPicker}
            onChange={change}
            onErrorsChange={setErrors}
            onSectionSelect={setMobilePane}
          />
          <Stack
            component="aside"
            id="preview"
            className={classes.previewPanel}
            aria-label={t("customWidget.workbench.widgetPreview")}
          >
            <CustomWidgetPreview
              key={`${revision}:${preview?.created.previewSession.id ?? "none"}`}
              client={client}
              queryUtils={props.queryUtils}
              domain={domain}
              bindings={props.bindings}
              isAdmin={props.isAdmin}
              capabilities={capabilities}
              preview={preview}
              pending={pending !== null || clearingSecret}
              t={t}
              onPreviewChange={(next) => {
                if (mounted.current && (!next || next.generation === generation.current)) setPreview(next);
              }}
              onOptionsChange={(next) => {
                generation.current += 1;
                setOptionsSnapshot(next);
                setPreview(null);
              }}
              onSaveTested={() => void save(true)}
            />
          </Stack>
        </div>
        <Modal
          opened={pasteOpened}
          onClose={() => setPasteOpened(false)}
          title={t("customWidget.workbench.ai.response")}
          size="lg"
        >
          <Stack>
            <Textarea value={paste} onChange={(event) => setPaste(event.currentTarget.value)} autosize minRows={10} />
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={() => setPasteOpened(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const parsed = domain.parseCustomWidgetAiResponse(paste);
                  if (!parsed.success) {
                    setErrors(
                      Object.fromEntries(
                        parsed.issues.map((issue) => [issue.path?.join(".") ?? "manifest", issue.message]),
                      ),
                    );
                    return;
                  }
                  const widget = parsed.widget;
                  setWarnings(
                    parsed.warnings.map((issue) => `${issue.path?.join(".") ?? "manifest"}: ${issue.message}`),
                  );
                  change({
                    name: widget.name,
                    description: widget.description ?? "",
                    iconUrl: widget.iconUrl ?? "",
                    sources: JSON.stringify(widget.sources, null, 2),
                    requests: JSON.stringify(widget.requests, null, 2),
                    options: JSON.stringify(widget.options, null, 2),
                    template: widget.template,
                  });
                  setOptionsSnapshot(domain.getCustomWidgetDefaultOptions(widget.options));
                  setPaste("");
                  setPasteOpened(false);
                }}
              >
                {t("customWidget.workbench.ai.loaded")}
              </Button>
            </Group>
          </Stack>
        </Modal>
        <Modal
          opened={discardOpened}
          onClose={() => setDiscardOpened(false)}
          title={t("nitro.widgetEditor.discardTitle")}
        >
          <Stack>
            <Text>{t("nitro.widgetEditor.discardDescription")}</Text>
            <Group justify="flex-end">
              <Button type="button" variant="default" onClick={() => setDiscardOpened(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button
                type="button"
                color="red"
                onClick={() => {
                  generation.current += 1;
                  const restored = structuredClone(baseline);
                  currentValues.current = restored;
                  setValues(restored);
                  setPreview(null);
                  setErrors({});
                  setError(null);
                  setDiscardOpened(false);
                }}
              >
                {t("common.action.discard")}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </CustomWidgetWorkbenchProvider>
  );
}
