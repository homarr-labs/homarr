import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hashKey } from "@tanstack/react-query";
import {
  Accordion,
  Alert,
  Avatar,
  Box,
  Button,
  ColorInput,
  Fieldset,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Tabs,
  TagsInput,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";

import { FormProvider, useForm } from "@homarr/widgets/inputs/form";
import { StaticWidgetInputOwnerProvider } from "@homarr/widgets/inputs/static";

import type {
  EditorIntegration,
  EditorPermissions,
  EditorSettings,
  EditorSize,
  EditorState,
  EditorTranslate,
  EmbeddedEditorHandle,
  WidgetDefinition,
  WidgetDraftResult,
  WidgetDraftWriter,
  WidgetEditorBindings,
  WidgetEditorDomain,
  WidgetEditorClient,
  WidgetEditorQueryUtils,
  WidgetEditorOwnership,
  WidgetKind,
} from "./contracts";
import { createWidgetEditorSchema, issueMessages, normalizeEditorState } from "./validation";
import { WidgetIntegrationSelect } from "./widget-integration-select";
import { supportsLocalOption, WidgetEditorFieldErrors, WidgetOptionField } from "./widget-option-fields";
import { isSharedOptionHeld, useWidgetInputActivation } from "./shared-controls";
import classes from "./widget-editor.module.css";

export interface WidgetEditorProps extends WidgetEditorOwnership {
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  opened: boolean;
  kind: WidgetKind;
  definition: WidgetDefinition;
  initialValue: EditorState;
  settings: EditorSettings;
  initialSize: EditorSize;
  maximumSize: EditorSize;
  integrationData: EditorIntegration[];
  boardId: string;
  itemId?: string;
  targetSectionId?: string;
  permissions: EditorPermissions;
  byteUnitSystem: "binary" | "decimal";
  domain: WidgetEditorDomain;
  bindings: WidgetEditorBindings;
  draftWriter?: WidgetDraftWriter;
  t: EditorTranslate;
  onClose(): void;
  onStaged(result: Extract<WidgetDraftResult, { kind: "staged" }>): void;
}

export function WidgetEditor(props: WidgetEditorProps) {
  const { definition, domain, t, bindings } = props;
  const theme = useMantineTheme();
  const formId = useId();
  const [pristineSize] = useState(() => ({
    width: Math.max(1, Math.min(Math.round(props.initialSize.width), props.maximumSize.width)),
    height: Math.max(1, Math.min(Math.round(props.initialSize.height), props.maximumSize.height)),
  }));
  const [size, setSize] = useState(pristineSize);
  const [integrations, setIntegrations] = useState(props.integrationData);
  const [specializedErrors, setSpecializedErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [creatingIntegration, setCreatingIntegration] = useState(false);
  const [discardOpened, setDiscardOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("widget");
  const [mountedIntegrationIds, setMountedIntegrationIds] = useState<string[]>([]);
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const optionDraftDirty = useRef(new Map<string, boolean>());
  const [optionDraftRevision, setOptionDraftRevision] = useState(0);
  const editorGeneration = useRef(0);
  const applyingPreviewChange = useRef(false);
  const activePreview = useRef<{ generation: number } | null>(null);
  const invalidatePreview = useCallback(() => {
    editorGeneration.current += 1;
    activePreview.current = null;
  }, []);
  const onDirtyChange = useCallback(
    (property: string, dirty: boolean) => {
      if (dirty) optionDraftDirty.current.set(property, true);
      else optionDraftDirty.current.delete(property);
      invalidatePreview();
      setOptionDraftRevision((current) => current + 1);
    },
    [invalidatePreview],
  );
  const appHandle = useRef<EmbeddedEditorHandle | null>(null);
  const integrationHandles = useRef(new Map<string, EmbeddedEditorHandle>());
  const integrationRefCallbacks = useRef(new Map<string, (handle: EmbeddedEditorHandle | null) => void>());
  const onValidityChange = useCallback((property: string, message: string | null) => {
    setSpecializedErrors((current) => {
      if (current[property] === (message ?? undefined)) return current;
      const next = { ...current };
      if (message) next[property] = message;
      else delete next[property];
      return next;
    });
  }, []);
  const getIntegrationRef = (id: string) => {
    const existing = integrationRefCallbacks.current.get(id);
    if (existing) return existing;
    const callback = (handle: EmbeddedEditorHandle | null) => {
      if (handle) integrationHandles.current.set(id, handle);
      else integrationHandles.current.delete(id);
    };
    integrationRefCallbacks.current.set(id, callback);
    return callback;
  };
  const submitting = useRef(false);
  const integrationCreationLock = useRef(false);
  const inputClosing = useRef(false);
  const [formOrigin] = useState(() => ({
    boardId: props.boardId,
    itemId: props.itemId,
    kind: props.kind,
    definition: props.definition,
    baseline: props.initialValue,
    sectionId: props.targetSectionId,
  }));
  const options = useMemo(() => definition.createOptions(props.settings), [definition, props.settings]);
  const hasIntegrationSupport = "supportedIntegrations" in definition;
  const required = hasIntegrationSupport && definition.integrationsRequired !== false;
  const maximum = definition.maxIntegrations ?? Infinity;
  const canConfigure = props.permissions.canModifyBoard && (props.kind !== "customApi" || props.permissions.isAdmin);
  const disabled = pending || creatingIntegration || !canConfigure;
  const schema = useMemo(
    () => createWidgetEditorSchema(options, domain, required, maximum),
    [options, domain, required, maximum],
  );
  const canChangeAdvanced = () =>
    props.opened &&
    !pending &&
    !creatingIntegration &&
    !discardOpened &&
    !submitting.current &&
    !integrationCreationLock.current &&
    props.permissions.canModifyBoard;
  const canChange = () => canConfigure && canChangeAdvanced();
  const { owner: inputOwner, retire: retireInputOwner } = useWidgetInputActivation({
    binding: {
      type: "editor",
      boardId: props.boardId,
      itemId: props.itemId,
      widgetKind: props.kind,
      definition: props.definition,
      baseline: props.initialValue,
      sectionId: props.targetSectionId,
      client: props.client,
      queryUtils: props.queryUtils,
    },
    isCurrentOwner: props.isCurrentOwner,
    captureChangeOwner: props.captureChangeOwner,
    canChange: () =>
      canChange() &&
      !inputClosing.current &&
      formOrigin.boardId === props.boardId &&
      formOrigin.itemId === props.itemId &&
      formOrigin.kind === props.kind &&
      formOrigin.definition === props.definition &&
      formOrigin.baseline === props.initialValue &&
      formOrigin.sectionId === props.targetSectionId,
  });
  useLayoutEffect(() => {
    if (!props.opened) inputClosing.current = false;
  }, [props.opened]);
  const form = useForm({
    mode: "controlled",
    initialValues: structuredClone(props.initialValue),
    validate: (current) => {
      const validation = schema.safeParse(current);
      if (validation.success) return {};
      return issueMessages(validation.error.issues);
    },
    validateInputOnBlur: true,
    validateInputOnChange: true,
    onValuesChange: () => {
      if (!applyingPreviewChange.current) invalidatePreview();
      setError(null);
    },
    enhanceGetInputProps: ({ field, inputProps }) => {
      let canChangeField = canChange;
      if (field.startsWith("advancedOptions.")) canChangeField = canChangeAdvanced;
      const onChange: (next: unknown) => void = inputProps.onChange;
      return {
        disabled: !canChangeField(),
        onChange: (next: unknown) => {
          if (inputOwner.isCurrent() && canChangeField()) onChange(next);
        },
      };
    },
  });
  const value = form.values;
  const errors = form.errors;
  const getOptionError = (property: string) => {
    const optionError = errors[`options.${property}`];
    if (typeof optionError === "string") return optionError;
    return specializedErrors[property];
  };
  const previewEnabled = props.opened && !disabled && !discardOpened && (!required || value.integrationIds.length > 0);
  const previewGeneration = useMemo(
    () => ({
      generation: editorGeneration.current,
      value,
      size,
      optionDraftRevision,
      previewEnabled,
      boardId: props.boardId,
      itemId: props.itemId,
      kind: props.kind,
      sectionId: props.targetSectionId,
      client: props.client,
      Preview: bindings.Preview,
      definition,
      settings: props.settings,
      maximumWidth: props.maximumSize.width,
      maximumHeight: props.maximumSize.height,
    }),
    [
      value,
      size,
      optionDraftRevision,
      previewEnabled,
      props.boardId,
      props.itemId,
      props.kind,
      props.targetSectionId,
      props.client,
      bindings.Preview,
      definition,
      props.settings,
      props.maximumSize.width,
      props.maximumSize.height,
    ],
  );
  useLayoutEffect(() => {
    if (!previewEnabled) return;
    activePreview.current = previewGeneration;
    return () => {
      if (activePreview.current === previewGeneration) activePreview.current = null;
    };
  }, [previewEnabled, previewGeneration]);
  const selected = integrations.filter((integration) => value.integrationIds.includes(integration.id));
  const integrationKinds = selected.map(({ kind }) => kind);
  const visible = Object.entries(options).filter(
    ([, option]) =>
      option.type !== "internal" &&
      !(
        "shouldHide" in option &&
        typeof option.shouldHide === "function" &&
        option.shouldHide(value.options, integrationKinds)
      ),
  );
  const missingOptionBindings = canConfigure
    ? visible.filter(
        ([, option]) =>
          isSharedOptionHeld(option.type) ||
          (!supportsLocalOption(option.type) &&
            !(bindings.SpecializedOption && bindings.supportsSpecializedOption?.(option.type))),
      )
    : [];
  const editable = selected.filter(
    (integration) => props.permissions.canModifyAllIntegrations || integration.permissions?.hasFullAccess === true,
  );
  const displayedIntegrationId =
    selected.length === 1
      ? (editable[0]?.id ?? null)
      : editable.some(({ id }) => id === activeIntegrationId)
        ? activeIntegrationId
        : null;
  const integrationIdsToRender = new Set(
    mountedIntegrationIds.filter((id) => editable.some((integration) => integration.id === id)),
  );
  if (displayedIntegrationId) integrationIdsToRender.add(displayedIntegrationId);
  const appId = typeof value.options.appId === "string" ? value.options.appId : undefined;
  const showAppTab =
    props.kind === "app" && props.permissions.canModifyApps && Boolean(appId) && Boolean(bindings.AppEditor);
  const showIntegrationTab = selected.length > 0 && Boolean(bindings.IntegrationEditor);
  const isDirty = () =>
    form.isDirty() ||
    JSON.stringify(size) !== JSON.stringify(pristineSize) ||
    optionDraftDirty.current.size > 0 ||
    Boolean(appHandle.current?.isDirty()) ||
    Array.from(integrationHandles.current.values()).some((handle) => handle.isDirty());

  const setOptions = (patch: Record<string, unknown>) => {
    if (!inputOwner.isCurrent()) return;
    form.setFieldValue("options", { ...form.getValues().options, ...patch });
  };
  const setPreviewOptions = (patch: Record<string, unknown>) => {
    if (
      activePreview.current !== previewGeneration ||
      editorGeneration.current !== previewGeneration.generation ||
      submitting.current ||
      integrationCreationLock.current
    )
      return;
    applyingPreviewChange.current = true;
    try {
      form.setFieldValue("options", { ...form.getValues().options, ...patch });
    } finally {
      applyingPreviewChange.current = false;
    }
  };
  const changeSize = (dimension: keyof EditorSize, next: string | number) => {
    if (!inputOwner.isCurrent() || typeof next !== "number" || !Number.isFinite(next)) return;
    invalidatePreview();
    setSize((current) => ({
      ...current,
      [dimension]: Math.max(1, Math.min(Math.round(next), props.maximumSize[dimension])),
    }));
  };
  const requestClose = () => {
    if (pending || creatingIntegration || submitting.current || integrationCreationLock.current) return;
    if (!props.isCurrentOwner()) return;
    retireInputOwner();
    invalidatePreview();
    if (isDirty()) setDiscardOpened(true);
    else {
      inputClosing.current = true;
      props.onClose();
    }
  };
  const beginIntegrationEdit = (id: string) => {
    setMountedIntegrationIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActiveIntegrationId(id);
  };
  const stage = async () => {
    if (!inputOwner.isCurrent() || submitting.current || integrationCreationLock.current) return;
    invalidatePreview();
    const submittedValue = structuredClone(form.getValues());
    const validation = schema.safeParse(submittedValue);
    form.setErrors(validation.success ? {} : issueMessages(validation.error.issues));
    const hasSpecializedError = visible.some(([property]) =>
      Object.keys(specializedErrors).some((path) => path === property || path.startsWith(`${property}.`)),
    );
    if (!validation.success || hasSpecializedError || missingOptionBindings.length > 0) {
      setActiveTab("widget");
      if (missingOptionBindings.length) setError(t("nitro.widgetEditor.specializedOptionsHeld"));
      return;
    }
    if (!props.draftWriter) {
      setError(t("nitro.widgetEditor.draftWriterUnavailable"));
      return;
    }
    retireInputOwner();
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      if (showAppTab && !(await appHandle.current?.submitIfDirty())) {
        setActiveTab("app");
        return;
      }
      for (const [id, handle] of integrationHandles.current) {
        if (!editable.some((integration) => integration.id === id)) continue;
        if (!(await handle.submitIfDirty())) {
          beginIntegrationEdit(id);
          setActiveTab("integration");
          return;
        }
      }
      const normalized = normalizeEditorState(submittedValue);
      const result = await props.draftWriter.stage(
        props.itemId
          ? {
              kind: "configure",
              itemId: props.itemId,
              value: normalized,
              size,
            }
          : {
              kind: "create",
              input: { kind: props.kind, ...normalized, size, targetSectionId: props.targetSectionId },
            },
      );
      if (result.kind === "rejected") {
        setError(result.message);
        return;
      }
      const draftValidation = domain.boardSaveSchema.safeParse(result.draft);
      const stagedItem = result.draft.items.find(({ id }) => id === result.itemId);
      if (
        !draftValidation.success ||
        result.draft.id !== props.boardId ||
        !stagedItem ||
        stagedItem.kind !== props.kind ||
        hashKey([stagedItem.options, stagedItem.integrationIds, stagedItem.advancedOptions]) !==
          hashKey([normalized.options, normalized.integrationIds, normalized.advancedOptions]) ||
        (props.itemId && result.itemId !== props.itemId)
      ) {
        setError(t("nitro.widgetEditor.draftRejected"));
        return;
      }
      retireInputOwner();
      props.onStaged(result);
      invalidatePreview();
      retireInputOwner();
      inputClosing.current = true;
      props.onClose();
    } catch {
      setError(t("common.notification.update.error"));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const createIntegration = async () => {
    if (
      !bindings.onCreateIntegration ||
      !inputOwner.isCurrent() ||
      !props.permissions.canCreateIntegration ||
      submitting.current ||
      integrationCreationLock.current
    )
      return;
    retireInputOwner();
    integrationCreationLock.current = true;
    invalidatePreview();
    setCreatingIntegration(true);
    setError(null);
    try {
      const integration = await bindings.onCreateIntegration(
        (definition.supportedIntegrations ?? []).filter((kind) => kind !== "mock"),
      );
      if (!integration) return;
      if (
        !(definition.supportedIntegrations ?? []).includes(integration.kind) ||
        !integration.permissions?.hasUseAccess
      ) {
        setError(t("item.create.missingIntegration.noPermission"));
        return;
      }
      setIntegrations((current) => [...current.filter(({ id }) => id !== integration.id), integration]);
      const current = form.getValues();
      let integrationIds = [integration.id];
      if (maximum > 1) integrationIds = [...new Set([...current.integrationIds, integration.id])].slice(0, maximum);
      form.setFieldValue("integrationIds", integrationIds);
    } catch {
      setError(t("common.notification.update.error"));
    } finally {
      integrationCreationLock.current = false;
      setCreatingIntegration(false);
    }
  };
  const renderOption = ([property, option]: (typeof visible)[number]) => (
    <Box key={property} className={option.type === "switch" ? classes.switchOption : undefined}>
      <WidgetOptionField
        client={props.client}
        queryUtils={props.queryUtils}
        property={property}
        option={option}
        kind={props.kind}
        value={value}
        initialOptions={form.getInitialValues().options}
        itemId={props.itemId}
        boardId={props.boardId}
        disabled={disabled || discardOpened || !props.opened}
        error={getOptionError(property)}
        validationErrors={errors}
        inputOwner={inputOwner}
        domain={domain}
        bindings={bindings}
        t={t}
        byteUnitSystem={props.byteUnitSystem}
        onChange={(next) => setOptions({ [property]: next })}
        onOptionsChange={setOptions}
        onValidityChange={onValidityChange}
        onDirtyChange={onDirtyChange}
      />
    </Box>
  );
  const Preview = bindings.Preview;
  const IntegrationEditor = bindings.IntegrationEditor;
  const AppEditor = bindings.AppEditor;
  const widgetPanel = (
    <Box className={classes.workspace} data-with-preview={Preview ? true : undefined}>
      {Preview && (
        <Stack className={classes.previewPanel} gap="sm">
          <Group gap="xs">
            {(["width", "height"] as const).map((dimension) => (
              <NumberInput
                key={dimension}
                label={t(`item.moveResize.field.${dimension}.label`)}
                value={size[dimension]}
                disabled={disabled}
                min={1}
                max={props.maximumSize[dimension]}
                allowDecimal={false}
                allowNegative={false}
                clampBehavior="strict"
                w={100}
                onChange={(next) => changeSize(dimension, next)}
              />
            ))}
          </Group>
          <Box className={classes.previewCanvas} inert>
            {required && value.integrationIds.length === 0 ? (
              <Alert color="gray">{t("item.edit.preview.integrationRequired")}</Alert>
            ) : (
              <Preview
                kind={props.kind}
                value={value}
                size={size}
                itemId={props.itemId}
                boardId={props.boardId}
                sectionId={props.targetSectionId}
                onOptionsChange={setPreviewOptions}
              />
            )}
          </Box>
        </Stack>
      )}
      <Stack
        component="form"
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          void stage();
        }}
        className={classes.settingsPanel}
        gap="sm"
      >
        {!props.permissions.canModifyBoard && (
          <Alert color="yellow">{t("nitro.widgetEditor.modifyPermissionRequired")}</Alert>
        )}
        {!props.draftWriter && <Alert color="yellow">{t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
        {canConfigure && hasIntegrationSupport && (
          <>
            <WidgetIntegrationSelect
              value={value.integrationIds}
              data={integrations.filter(
                (integration) =>
                  (definition.supportedIntegrations ?? []).includes(integration.kind) &&
                  integration.permissions?.hasUseAccess === true,
              )}
              onChange={(integrationIds) => {
                if (inputOwner.isCurrent()) form.setFieldValue("integrationIds", integrationIds);
              }}
              multiple={maximum > 1}
              required={required}
              disabled={disabled}
              error={typeof errors.integrationIds === "string" ? errors.integrationIds : undefined}
              domain={domain}
              t={t}
            />
            <WidgetEditorFieldErrors path="integrationIds" errors={errors} />
            {props.permissions.canCreateIntegration &&
              bindings.onCreateIntegration &&
              (maximum === 1 || value.integrationIds.length < maximum) && (
                <Button
                  variant="subtle"
                  type="button"
                  loading={creatingIntegration}
                  disabled={pending}
                  onClick={() => void createIntegration()}
                >
                  {t("common.action.create")}
                </Button>
              )}
          </>
        )}
        {canConfigure && (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {visible.filter(([, option]) => option.type === "switch").map(renderOption)}
          </SimpleGrid>
        )}
        {canConfigure && visible.filter(([, option]) => option.type !== "switch").map(renderOption)}
        <Accordion variant="contained">
          <Accordion.Item value="advanced-options">
            <Accordion.Control>{t("item.edit.advancedOptions.label")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label={t("item.edit.field.title.label")}
                  {...form.getInputProps("advancedOptions.title")}
                  value={value.advancedOptions.title ?? ""}
                />
                <TagsInput
                  label={t("item.edit.field.customCssClasses.label")}
                  {...form.getInputProps("advancedOptions.customCssClasses")}
                />
                <ColorInput
                  label={t("item.edit.field.borderColor.label")}
                  format="hex"
                  swatches={Object.values(theme.colors).map((colors) => colors[6])}
                  {...form.getInputProps("advancedOptions.borderColor")}
                />
                <WidgetEditorFieldErrors path="advancedOptions" errors={errors} />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Box>
  );
  return (
    <FormProvider form={form}>
      <StaticWidgetInputOwnerProvider owner={inputOwner}>
        <Modal
          opened={props.opened}
          onClose={requestClose}
          title={`${t("item.edit.title")} - ${domain.widgetName(props.kind)}`}
          size="80rem"
          closeOnClickOutside={false}
          closeOnEscape={!pending}
          closeButtonProps={{ disabled: pending }}
        >
          <Stack gap="sm">
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            {showAppTab || showIntegrationTab ? (
              <Tabs value={activeTab} onChange={setActiveTab} keepMounted>
                <Tabs.List grow>
                  <Tabs.Tab value="widget">{t("item.edit.tab.widget")}</Tabs.Tab>
                  {showAppTab && <Tabs.Tab value="app">{t("item.edit.tab.app")}</Tabs.Tab>}
                  {showIntegrationTab && <Tabs.Tab value="integration">{t("item.edit.tab.integration")}</Tabs.Tab>}
                </Tabs.List>
                <Tabs.Panel value="widget" pt="sm">
                  {widgetPanel}
                </Tabs.Panel>
                {showAppTab && AppEditor && appId && (
                  <Tabs.Panel value="app" pt="sm">
                    <AppEditor
                      id={appId}
                      handleRef={(handle) => {
                        appHandle.current = handle;
                      }}
                    />
                  </Tabs.Panel>
                )}
                {showIntegrationTab && (
                  <Tabs.Panel value="integration" pt="sm">
                    <Stack>
                      {displayedIntegrationId === null &&
                        selected.map((integration) => (
                          <Group key={integration.id} justify="space-between" wrap="nowrap">
                            <Group wrap="nowrap">
                              <Avatar size="sm" src={domain.getIconUrl(integration.kind)} />
                              <Stack gap={0}>
                                <Text size="sm" fw={600}>
                                  {integration.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {integration.url}
                                </Text>
                              </Stack>
                            </Group>
                            {editable.some(({ id }) => id === integration.id) ? (
                              <Button
                                type="button"
                                variant="light"
                                onClick={() => beginIntegrationEdit(integration.id)}
                              >
                                {t("item.edit.integration.action")}
                              </Button>
                            ) : (
                              <Text size="xs">{t("item.edit.integration.fullAccessRequired")}</Text>
                            )}
                          </Group>
                        ))}
                      {displayedIntegrationId && selected.length > 1 && (
                        <Button type="button" variant="subtle" onClick={() => setActiveIntegrationId(null)}>
                          {t("common.action.previous")}
                        </Button>
                      )}
                      {Array.from(integrationIdsToRender).map((id) => (
                        <Box key={id} hidden={id !== displayedIntegrationId}>
                          {IntegrationEditor && <IntegrationEditor id={id} handleRef={getIntegrationRef(id)} />}
                        </Box>
                      ))}
                    </Stack>
                  </Tabs.Panel>
                )}
              </Tabs>
            ) : (
              widgetPanel
            )}
            {!Preview && (
              <Fieldset legend={t("item.edit.preview.size")}>
                <Group>
                  {(["width", "height"] as const).map((dimension) => (
                    <NumberInput
                      key={dimension}
                      label={t(`item.moveResize.field.${dimension}.label`)}
                      value={size[dimension]}
                      min={1}
                      max={props.maximumSize[dimension]}
                      allowDecimal={false}
                      clampBehavior="strict"
                      disabled={disabled}
                      onChange={(next) => changeSize(dimension, next)}
                    />
                  ))}
                </Group>
              </Fieldset>
            )}
            <Group className={classes.footer} justify="flex-end">
              <Button type="button" variant="default" disabled={pending} onClick={requestClose}>
                {t("common.action.cancel")}
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={pending}
                disabled={!props.permissions.canModifyBoard || creatingIntegration || !props.draftWriter}
              >
                {t("nitro.widgetEditor.applyToDraft")}
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
              <Button variant="default" onClick={() => setDiscardOpened(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button
                color="red"
                onClick={() => {
                  retireInputOwner();
                  inputClosing.current = true;
                  invalidatePreview();
                  setDiscardOpened(false);
                  props.onClose();
                }}
              >
                {t("common.action.discard")}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </StaticWidgetInputOwnerProvider>
    </FormProvider>
  );
}
