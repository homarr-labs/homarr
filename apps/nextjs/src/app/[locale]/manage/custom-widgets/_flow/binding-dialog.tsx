"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Accordion,
  Alert,
  Autocomplete,
  Button,
  Code,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { collectTemplateReferences } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { isFlowBindingCurrent } from "./connection-planner";
import type { FlowBindingIntent } from "./connection-planner";
import { bindingCandidate, bindingDescriptor, bindingParameters, createBindingParameters } from "./binding-code";
import type { BindingChoices } from "./binding-code";
import { BindingParameterEditor } from "./binding-parameter-editor";
import { BindingOptionEditor } from "./binding-option-editor";
import { requestOptionCandidate } from "./binding-request-option";
import { readObject } from "./graph";
import { useWorkbenchQuery } from "./execution";
import { nativeInputFields } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";

export function FlowBindingDialog(props: {
  intent: FlowBindingIntent;
  form: CustomWidgetWorkbenchForm;
  onClose(): void;
}) {
  const t = useI18n("customWidget.flow");
  const catalog = clientApi.customWidget.nativeCapabilities.useQuery(undefined, { enabled: props.intent.native });
  const descriptor = bindingDescriptor(props.intent);
  const schema = catalog.data?.find((entry) => entry.id === descriptor.capability)?.inputSchema;
  let title = t("bindingTitle");
  if (props.intent.kind === "requestOption") title = t("bindingConfigureRequest");
  return (
    <Modal
      opened
      onClose={props.onClose}
      title={title}
      closeButtonProps={{ "aria-label": t("bindingCancel") }}
      size="lg"
    >
      {props.intent.native && !schema ? (
        <Alert color="yellow">
          {catalog.isError ? t("bindingCatalogError") : t("bindingCatalogLoading")}
          {catalog.isError && (
            <Button type="button" size="xs" onClick={() => void catalog.refetch()}>
              {t("bindingRetry")}
            </Button>
          )}
        </Alert>
      ) : (
        <BindingEditor {...props} schema={schema ?? {}} />
      )}
    </Modal>
  );
}

function BindingEditor({
  intent,
  form,
  onClose,
  schema,
}: {
  intent: FlowBindingIntent;
  form: CustomWidgetWorkbenchForm;
  onClose(): void;
  schema: NativeInputSchema;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
  const [choices, setChoices] = useState<BindingChoices>(() => ({
    format: "json",
    path: "",
    columns: "name",
    label: intent.identifier,
    option: Object.keys(readObject(intent.snapshot.options))[0] ?? "",
    field: nativeInputFields(schema)[0]?.name ?? "value",
    location: intent.native ? "input" : "query",
    params: createBindingParameters(intent, schema),
  }));
  const [applyError, setApplyError] = useState<string | null>(null);
  const sample = useWorkbenchQuery(intent.identifier);
  const paths = useMemo(() => samplePaths(sample?.data), [sample?.data]);
  const options = readObject(intent.snapshot.options);
  const inputs = [
    ...new Set(
      collectTemplateReferences(intent.snapshot.template)
        .filter((entry) => entry.kind === "bind")
        .map((entry) => entry.name),
    ),
  ];
  const params = bindingParameters(intent, schema);
  const current = isFlowBindingCurrent(intent, store.getValues());
  const change = (patch: Partial<BindingChoices>) => {
    setChoices((value) => ({ ...value, ...patch }));
    setApplyError(null);
  };
  const prepare = () => {
    if (intent.kind === "requestOption") return requestOptionCandidate(intent, store.getValues(), choices, schema);
    return bindingCandidate(intent, store.getValues(), choices, {
      loading: t("bindingLoading"),
      empty: t("bindingEmpty"),
      run: t("bindingRun"),
      error: t("bindingError"),
    });
  };
  let candidate: ReturnType<typeof prepare> | undefined;
  let error: string | null = null;
  try {
    if (current) candidate = prepare();
  } catch (reason) {
    error = reason instanceof Error ? reason.message : t("bindingError");
  }
  return (
    <Stack gap="md" data-workbench-local-input>
      <Text size="sm" c="dimmed">
        {t("bindingDescription")}
      </Text>
      {(intent.kind === "option" || intent.kind === "requestOption") && (
        <BindingOptionEditor intent={intent} choices={choices} schema={schema} onChange={change} />
      )}
      {intent.kind === "query" && (
        <>
          <Select
            label={t("bindingDisplay")}
            value={choices.format}
            data={[
              { value: "json", label: t("bindingJson") },
              { value: "text", label: t("bindingText") },
              { value: "list", label: t("bindingList") },
              { value: "table", label: t("bindingTable") },
            ]}
            onChange={(format) => format && change({ format: format as BindingChoices["format"] })}
          />
          <Autocomplete
            label={t("bindingDataPath")}
            description={t("bindingDataPathHint")}
            data={paths}
            value={choices.path}
            onChange={(path) => change({ path })}
          />
          {choices.format === "table" && (
            <TextInput
              label={t("bindingColumns")}
              description={t("bindingColumnsHint")}
              value={choices.columns}
              onChange={(event) => change({ columns: event.currentTarget.value })}
            />
          )}
        </>
      )}
      {intent.kind === "action" && (
        <TextInput
          label={t("bindingButtonLabel")}
          value={choices.label}
          onChange={(event) => change({ label: event.currentTarget.value })}
        />
      )}
      {(intent.kind === "query" || intent.kind === "action") && params.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {t("bindingParameterHint")}
          </Text>
          {params.map(
            ({ name, schema: fieldSchema }) =>
              choices.params[name] && (
                <BindingParameterEditor
                  key={name}
                  name={name}
                  schema={fieldSchema}
                  parameter={choices.params[name]}
                  options={options}
                  inputs={inputs}
                  onChange={(value) => change({ params: { ...choices.params, [name]: value } })}
                />
              ),
          )}
        </Stack>
      )}
      {!current && (
        <Alert color="yellow" aria-live="polite">
          {t("bindingStale")}
        </Alert>
      )}
      {(error || applyError) && (
        <Alert color="yellow" aria-live="polite">
          {applyError ?? error}
        </Alert>
      )}
      {candidate && (
        <Accordion variant="contained">
          <Accordion.Item value="code">
            <Accordion.Control>{t("bindingReview")}</Accordion.Control>
            <Accordion.Panel>
              <Code block mah={240} style={{ overflow: "auto", whiteSpace: "pre-wrap" }}>
                {candidate.preview}
              </Code>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
      <Group justify="end">
        <Button type="button" variant="default" onClick={onClose}>
          {t("bindingCancel")}
        </Button>
        <Button
          type="button"
          disabled={!current || !candidate}
          onClick={() => {
            try {
              if (!isFlowBindingCurrent(intent, store.getValues())) throw new Error(t("bindingStale"));
              const result = prepare();
              store.transaction(() => form.setValues({ ...store.getValues(), ...result.patch }));
              onClose();
            } catch (reason) {
              setApplyError(reason instanceof Error ? reason.message : t("bindingError"));
            }
          }}
        >
          {t("bindingApply")}
        </Button>
      </Group>
    </Stack>
  );
}

function samplePaths(value: unknown) {
  const paths: string[] = [];
  const visit = (entry: unknown, path: string, depth: number) => {
    if (paths.length >= 100 || depth > 5 || !entry || typeof entry !== "object") return;
    for (const [key, child] of Object.entries(entry).slice(0, 25)) {
      if (key.includes(".")) continue;
      let next = key;
      if (path) next = `${path}.${key}`;
      paths.push(next);
      if (!Array.isArray(entry)) visit(child, next, depth + 1);
    }
  };
  visit(value, "", 0);
  return paths.slice(0, 100);
}
