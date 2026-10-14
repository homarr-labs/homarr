import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Button,
  ColorInput,
  Group,
  Input,
  MultiSelect,
  NumberInput,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { CodeEditor } from "../../source-ui/widgets-editor/code-editor";
import { CustomWidgetWorkbenchProvider } from "../../source-ui/widgets-editor/workbench-context";

import type { CustomWidgetOption } from "../../../../../packages/custom-widgets/src/core";
import type {
  EditorInputs,
  EditorOutputs,
  EditorTranslate,
  SpecializedOptionProps,
  WidgetEditorDomain,
  WidgetEditorBindings,
} from "./contracts";

type AvailableDefinition = EditorOutputs["customWidget"]["available"][number];

export function CustomWidgetConfiguration(
  props: SpecializedOptionProps & { domain: WidgetEditorDomain; t: EditorTranslate; bindings: WidgetEditorBindings },
) {
  const { t, domain } = props;
  const definitionId = typeof props.value.options.definitionId === "string" ? props.value.options.definitionId : "";
  const available = useQuery(
    props.queryUtils.customWidget.available.queryOptions({
      input: { boardId: props.boardId, currentId: definitionId || undefined },
      enabled: Boolean(props.boardId),
      retry: false,
    }),
  );
  const definition = available.data?.find(({ id }) => id === definitionId);
  const options = definition?.options;
  const value = props.value.options[props.property];
  const configuration = useMemo(
    () => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}),
    [value],
  );
  const version = definition?.updatedAt.getTime();
  const repair =
    props.option.type === "customWidgetConfiguration" &&
    version !== undefined &&
    props.value.options.configurationVersion !== version &&
    !definition?.migrationRequired;
  const effective = useMemo(
    () => (options && repair ? domain.normalizeCustomWidgetOptions(options, configuration) : configuration),
    [options, repair, domain, configuration],
  );
  const configuring = props.option.type === "customWidgetConfiguration";
  const issues = configuring && options ? domain.validateCustomWidgetOptions(options, effective) : [];
  const unsupported =
    configuring &&
    Object.values(options ?? {}).some(
      (option) =>
        typeof option === "object" &&
        option !== null &&
        "control" in option &&
        typeof option.control === "string" &&
        ((option.control === "icon" && !props.bindings.IconPicker) ||
          (option.control === "date" && !props.bindings.DateInput) ||
          (option.control === "time" && !props.bindings.TimeInput)),
    );
  const validity = definition?.migrationRequired
    ? t("widget.customApi.picker.migrationRequired")
    : available.isError
      ? t("common.notification.update.error")
      : !definitionId || !definition || available.isPending
        ? t("nitro.widgetEditor.customDefinitionRequired")
        : unsupported
          ? t("nitro.widgetEditor.specializedOptionsHeld")
          : (issues[0]?.message ?? null);
  const notifyValidity = props.onValidityChange;
  useEffect(() => {
    notifyValidity(props.property, validity);
  }, [notifyValidity, props.property, validity]);
  const applyOptions = props.onOptionsChange;
  useEffect(() => {
    if (props.disabled || !repair || version === undefined) return;
    applyOptions({ [props.property]: effective, configurationVersion: version });
  }, [applyOptions, effective, props.disabled, props.property, repair, version]);
  if (props.option.type === "customWidgetSelect")
    return (
      <Stack gap="sm">
        <Select
          label={t("widget.customApi.option.definitionId.label")}
          searchable
          disabled={props.disabled || available.isPending}
          error={props.error}
          data={(available.data ?? []).map((entry) => ({
            value: entry.id,
            label: entry.name,
            disabled: entry.migrationRequired,
          }))}
          value={definitionId || null}
          onChange={(id) => {
            const selected = available.data?.find((entry) => entry.id === id);
            if (!selected || selected.migrationRequired) return;
            applyOptions({
              [props.property]: selected.id,
              configuration: selected.defaultOptions,
              configurationVersion: selected.updatedAt.getTime(),
            });
          }}
        />
        {available.isError && (
          <Alert color="red">
            <Button variant="subtle" onClick={() => void available.refetch()}>
              {t("common.action.tryAgain")}
            </Button>
          </Alert>
        )}
        {definition?.migrationRequired && (
          <Alert color="yellow">{t("widget.customApi.picker.migrationDescription")}</Alert>
        )}
      </Stack>
    );
  if (!definitionId || !definition || !options) return <Alert color="yellow">{validity}</Alert>;
  const entries = Object.entries(options);
  const renderOption = ([property, option]: (typeof entries)[number]) => (
    <CustomOptionField
      property={property}
      key={`${definitionId}:${property}`}
      option={option}
      value={effective[property]}
      onChange={(next) => props.onChange({ ...effective, [property]: next })}
      configuration={effective}
      definition={definition}
      props={props}
    />
  );
  return (
    <Stack gap="md">
      {validity && <Alert color="yellow">{validity}</Alert>}
      {entries.filter(([, option]) => !option.advanced).map(renderOption)}
      {entries.some(([, option]) => option.advanced) && (
        <Accordion variant="contained">
          <Accordion.Item value="advanced-options">
            <Accordion.Control>{t("widget.customApi.configuration.advancedOptions")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">{entries.filter(([, option]) => option.advanced).map(renderOption)}</Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
}

function CustomOptionField(input: {
  property: string;
  option: CustomWidgetOption;
  value: unknown;
  configuration: Record<string, unknown>;
  definition: AvailableDefinition;
  props: SpecializedOptionProps & { domain: WidgetEditorDomain; t: EditorTranslate; bindings: WidgetEditorBindings };
  onChange(value: unknown): void;
}) {
  const { option, value, onChange, props } = input;
  const common = { label: option.label, description: option.description, disabled: props.disabled };
  if (option.choicesFrom) return <DynamicCustomOption {...input} />;
  if (option.control === "switch")
    return <Switch {...common} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />;
  if (option.control === "number" || option.control === "duration")
    return (
      <NumberInput
        {...common}
        min={option.min}
        max={option.max}
        step={option.step}
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    );
  if (option.control === "slider")
    return (
      <Input.Wrapper {...common}>
        <Slider
          min={option.min ?? 0}
          max={option.max ?? 100}
          step={option.step ?? 1}
          disabled={props.disabled}
          aria-label={option.label}
          value={typeof value === "number" ? value : 0}
          onChange={onChange}
        />
      </Input.Wrapper>
    );
  const choices = option.choices?.map((choice) => ({ label: choice.label, value: String(choice.value) })) ?? [];
  if (option.control === "select")
    return (
      <Select
        {...common}
        data={choices}
        value={typeof value === "string" || typeof value === "number" ? String(value) : null}
        onChange={(next) => onChange(coerceChoice(next, option))}
      />
    );
  if (option.control === "multiSelect")
    return (
      <MultiSelect
        {...common}
        data={choices}
        value={Array.isArray(value) ? value.map(String) : []}
        onChange={(next) => onChange(next.map((entry) => coerceChoice(entry, option)))}
      />
    );
  if (option.control === "textarea")
    return (
      <Textarea
        {...common}
        value={typeof value === "string" ? value : ""}
        autosize
        minRows={3}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  if (option.control === "color")
    return <ColorInput {...common} value={typeof value === "string" ? value : ""} onChange={onChange} />;
  if (option.control === "timeZone")
    return (
      <Select
        {...common}
        searchable
        data={Intl.supportedValuesOf("timeZone")}
        value={typeof value === "string" ? value : null}
        onChange={onChange}
      />
    );
  if (option.control === "json") return <JsonCustomOption {...input} />;
  const IconPicker = props.bindings.IconPicker;
  const DateInput = props.bindings.DateInput;
  const TimeInput = props.bindings.TimeInput;
  if (option.control === "icon" && IconPicker)
    return <IconPicker disabled={props.disabled} value={typeof value === "string" ? value : ""} onChange={onChange} />;
  if (option.control === "date" && DateInput)
    return (
      <DateInput
        {...common}
        valueFormat="YYYY-MM-DD"
        value={typeof value === "string" ? value : null}
        onChange={onChange}
      />
    );
  if (option.control === "time" && TimeInput)
    return (
      <TimeInput
        {...common}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  if (["date", "time", "icon"].includes(option.control))
    return (
      <Alert color="yellow">
        {props.t("nitro.widgetEditor.specializedOptionUnavailable", { type: option.control })}
      </Alert>
    );
  return (
    <TextInput
      {...common}
      type={option.control === "url" ? "url" : "text"}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function JsonCustomOption(input: Parameters<typeof CustomOptionField>[0]) {
  const serialized = JSON.stringify(input.value ?? null, null, 2);
  const [draft, setDraft] = useState(serialized);
  const pristineDraft = useRef(serialized);
  const synchronized = useRef(serialized);
  const [error, setError] = useState<string | null>(null);
  const validityPath = `${input.props.property}.${input.property}`;
  const notifyDirty = input.props.onDirtyChange;
  useEffect(() => {
    if (synchronized.current === serialized) return;
    synchronized.current = serialized;
    setDraft(serialized);
    setError(null);
    notifyDirty(validityPath, serialized !== pristineDraft.current);
  }, [notifyDirty, serialized, validityPath]);
  useEffect(() => () => notifyDirty(validityPath, false), [notifyDirty, validityPath]);
  const notifyValidity = input.props.onValidityChange;
  useEffect(() => {
    notifyValidity(validityPath, error);
    return () => notifyValidity(validityPath, null);
  }, [error, notifyValidity, validityPath]);
  return (
    <CustomWidgetWorkbenchProvider
      t={input.props.t}
      CodeEditor={input.props.bindings.CodeEditor ?? CustomWidgetCodeEditor}
      integrations={[]}
    >
      <CodeEditor
        id={`${input.definition.id}-${input.property}-json-option`}
        language="json"
        label={input.option.label}
        description={input.option.description}
        value={draft}
        error={error}
        readOnly={input.props.disabled}
        height="180px"
        onChange={(next) => {
          notifyDirty(validityPath, next !== pristineDraft.current);
          setDraft(next);
          try {
            const parsed: unknown = JSON.parse(next);
            synchronized.current = JSON.stringify(parsed ?? null, null, 2);
            input.onChange(parsed);
            setError(null);
          } catch {
            setError(input.props.t("customWidget.workbench.invalidWidget"));
          }
        }}
      />
    </CustomWidgetWorkbenchProvider>
  );
}

function DynamicCustomOption(input: Parameters<typeof CustomOptionField>[0]) {
  const { option, props } = input;
  const source = option.choicesFrom;
  const params: EditorInputs["customWidget"]["optionRequest"]["params"] = Object.fromEntries(
    Object.entries(input.configuration).filter(
      (entry): entry is [string, string | number | boolean] =>
        typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean",
    ),
  );
  const query = useQuery(
    props.queryUtils.customWidget.optionRequest.queryOptions({
      input: { boardId: props.boardId, definitionId: input.definition.id, requestId: source?.request ?? "", params },
      enabled: Boolean(source?.request),
      retry: false,
    }),
  );
  const validityPath = `${props.property}.${input.property}`;
  const notifyValidity = props.onValidityChange;
  const validityError =
    query.isPending || query.isError || query.data?.ok === false ? props.t("common.notification.update.error") : null;
  useEffect(() => {
    notifyValidity(validityPath, validityError);
    return () => notifyValidity(validityPath, null);
  }, [notifyValidity, validityError, validityPath]);
  const collection = source?.itemsPath ? getByPath(query.data?.data, source.itemsPath) : query.data?.data;
  const data = (Array.isArray(collection) ? collection : []).flatMap((row) => {
    const value = source ? getByPath(row, source.valuePath) : undefined;
    const label = source ? getByPath(row, source.labelPath) : undefined;
    return typeof value === "string" || typeof value === "number"
      ? [{ value: String(value), label: String(label ?? value) }]
      : [];
  });
  const common = {
    label: option.label,
    description: option.description,
    data,
    searchable: true,
    disabled: props.disabled || query.isError,
    rightSection: query.isFetching ? "…" : undefined,
  };
  return (
    <Stack gap="xs">
      {option.control === "multiSelect" ? (
        <MultiSelect
          {...common}
          value={Array.isArray(input.value) ? input.value.map(String) : []}
          onChange={(next) => input.onChange(next.map((value) => coerceChoice(value, option)))}
        />
      ) : (
        <Select
          {...common}
          value={input.value == null ? null : String(input.value)}
          onChange={(next) => input.onChange(coerceChoice(next, option))}
        />
      )}
      {query.isError && (
        <Group>
          <Text size="xs" c="red">
            {props.t("common.notification.update.error")}
          </Text>
          <Button variant="subtle" size="xs" onClick={() => void query.refetch()}>
            {props.t("common.action.tryAgain")}
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function coerceChoice(value: string | null, option: CustomWidgetOption) {
  if (value === null) return null;
  return typeof option.default === "number" ||
    option.choices?.some((choice) => typeof choice.value === "number" && String(choice.value) === value)
    ? Number(value)
    : value;
}

function getByPath(value: unknown, path: string): unknown {
  return path
    .replace(/^\$\.?/u, "")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === "object" && !Array.isArray(current) && segment in current
          ? Reflect.get(current, segment)
          : undefined,
      value,
    );
}
