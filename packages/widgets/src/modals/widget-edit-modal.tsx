"use client";

/* eslint-disable react/no-unstable-nested-components -- Widget modules and definition-bound fallbacks are loaded dynamically. */

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentType, FormEvent, PropsWithChildren } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  CloseButton,
  ColorInput,
  Divider,
  Group,
  Input as MantineInput,
  NumberInput,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { schemaResolver } from "@mantine/form";
import { useElementSize } from "@mantine/hooks";
import { IconArrowLeft, IconEye, IconPencil, IconSettings } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common";
import { IntegrationProvider, useSession } from "@homarr/auth/client";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeForm } from "@homarr/modals";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { SpotlightProvider } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, TextMultiSelect } from "@homarr/ui";
import { zodErrorMap } from "@homarr/validation/form/i18n";

import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { BoardItemAdvancedOptions } from "../../../validation/src/shared";
import type { OptionsBuilderResult } from "../options";
import type { WidgetComponentProps, WidgetDefinition } from "../definition";
import { WidgetError } from "../errors/component";
import { OPTIONS_SUPER_REFINE } from "../options";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import { WidgetCardShell, WidgetTitleBadge } from "../widget-card-shell";
import type { EmbeddedAppEditFormHandle } from "./embedded-app-edit-form";
import { EmbeddedAppEditForm } from "./embedded-app-edit-form";
import classes from "./widget-edit-modal.module.css";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrationIds: string[];
  advancedOptions: BoardItemAdvancedOptions;
}

export interface WidgetEditModalSize {
  width: number;
  height: number;
}

export interface WidgetPreviewDimensions extends WidgetEditModalSize {
  scale?: number;
}

interface WidgetEditPreviewResizeOptions {
  initialSize: WidgetEditModalSize;
  maximumSize: WidgetEditModalSize;
  getDimensions?: (size: WidgetEditModalSize) => WidgetPreviewDimensions;
}

export interface EmbeddedIntegrationEditFormHandle {
  submitIfDirty: () => Promise<boolean>;
}

export interface EmbeddedIntegrationEditFormProps {
  integrationId: string;
  handleRef: React.Ref<EmbeddedIntegrationEditFormHandle>;
  onSuccess?: () => void;
}

export interface WidgetEditModalProps<TSort extends WidgetKind> {
  kind: TSort;
  definition: WidgetDefinition;
  value: WidgetEditModalState;
  onSuccessfulEdit: (value: WidgetEditModalState, size?: WidgetEditModalSize) => void;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
  settings: SettingsContextProps;
  itemId?: string;
  boardId?: string;
  appId?: string;
  integrationEditForm?: ComponentType<EmbeddedIntegrationEditFormProps>;
  onIntegrationSaved?: () => void;
  onOpenNewIntegration?: (onCreated?: (id: string) => void) => void;
  previewComponent?: ComponentType<WidgetComponentProps<TSort>>;
  previewDimensions?: WidgetPreviewDimensions;
  previewResize?: WidgetEditPreviewResizeOptions;
  previewWrapper?: ComponentType<PropsWithChildren>;
}

interface WidgetEditPreviewProps {
  kind: WidgetKind;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
  definition: WidgetDefinition;
  state: WidgetEditModalState;
  itemId?: string;
  boardId?: string;
  dimensions?: WidgetPreviewDimensions;
  integrationData: IntegrationSelectOption[];
  onChangeOptions: (newOptions: Record<string, unknown>) => void;
  resize?: {
    size: WidgetEditModalSize;
    maximumSize: WidgetEditModalSize;
    onChange: (size: WidgetEditModalSize) => void;
  };
  PreviewWrapper?: ComponentType<PropsWithChildren>;
}

const PreviewRuntimeBoundary = ({
  Wrapper,
  children,
}: PropsWithChildren<{ Wrapper?: ComponentType<PropsWithChildren> }>) => {
  if (!Wrapper) return children;
  return <Wrapper>{children}</Wrapper>;
};

const normalizePreviewSize = (size: WidgetEditModalSize, maximumSize: WidgetEditModalSize): WidgetEditModalSize => ({
  width: Math.max(1, Math.min(Math.round(size.width), maximumSize.width)),
  height: Math.max(1, Math.min(Math.round(size.height), maximumSize.height)),
});

const WidgetEditPreview = ({
  kind,
  Component,
  definition,
  state,
  itemId,
  boardId,
  dimensions = { width: 400, height: 240 },
  integrationData,
  onChangeOptions,
  resize,
  PreviewWrapper,
}: WidgetEditPreviewProps) => {
  const t = useI18n();
  const tItem = useI18n("item.edit");
  const board = useOptionalBoard();
  const generatedPreviewId = useId().replaceAll(":", "");
  const { ref, width: availableWidth, height: availableHeight } = useElementSize<HTMLDivElement>();
  const sourceWidth = Math.max(dimensions.width, 1);
  const sourceHeight = Math.max(dimensions.height, 1);
  let maximumScale = dimensions.scale ?? 0.9;
  if (!Number.isFinite(maximumScale) || maximumScale <= 0) maximumScale = 0.9;
  maximumScale = Math.min(maximumScale, 0.9);
  let previewScale = maximumScale;
  if (availableWidth > 0 && availableHeight > 0) {
    previewScale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight, maximumScale);
  }
  const previewWidth = sourceWidth * previewScale;
  const previewHeight = sourceHeight * previewScale;

  const hasIntegrationSupport = "supportedIntegrations" in definition;
  const integrationRequired = hasIntegrationSupport && definition.integrationsRequired !== false;
  const isMissingIntegration = integrationRequired && state.integrationIds.length === 0;
  const previewIntegrations = integrationData
    .filter((integration) => state.integrationIds.includes(integration.id))
    .map((integration) => ({
      id: integration.id,
      permissions: integration.permissions ?? {
        hasFullAccess: false,
        hasInteractAccess: false,
        hasUseAccess: false,
      },
    }));
  let componentItemId = itemId;
  if (kind === "assistant" || kind === "timer") {
    componentItemId = `widget-preview-${generatedPreviewId}`;
  }
  const isPendingCustomWidget = kind === "customApi" && !itemId;
  const previewOpacity = (board?.opacity ?? 100) / 100;
  const handleResizeValue = (dimension: keyof WidgetEditModalSize, value: string | number) => {
    if (typeof value !== "number" || !Number.isFinite(value) || !resize) return;
    resize.onChange(
      normalizePreviewSize(
        {
          ...resize.size,
          [dimension]: value,
        },
        resize.maximumSize,
      ),
    );
  };

  return (
    <Stack className={classes.previewPanel} gap={0}>
      <Center ref={ref} className={classes.previewCanvas}>
        {resize && (
          <Group className={classes.previewSizeControls} gap={6} wrap="nowrap">
            <Text size="xs" fw={600} c="dimmed">
              {tItem("preview.size")}
            </Text>
            <Tooltip label={t("item.moveResize.field.width.label")}>
              <NumberInput
                className={classes.previewSizeInput}
                aria-label={t("item.moveResize.field.width.label")}
                value={resize.size.width}
                onChange={(value) => handleResizeValue("width", value)}
                min={1}
                max={resize.maximumSize.width}
                step={1}
                allowDecimal={false}
                allowNegative={false}
                clampBehavior="strict"
                size="xs"
                leftSection={t("item.moveResize.field.width.shortLabel")}
                leftSectionPointerEvents="none"
              />
            </Tooltip>
            <Text size="xs" c="dimmed" aria-hidden>
              ×
            </Text>
            <Tooltip label={t("item.moveResize.field.height.label")}>
              <NumberInput
                className={classes.previewSizeInput}
                aria-label={t("item.moveResize.field.height.label")}
                value={resize.size.height}
                onChange={(value) => handleResizeValue("height", value)}
                min={1}
                max={resize.maximumSize.height}
                step={1}
                allowDecimal={false}
                allowNegative={false}
                clampBehavior="strict"
                size="xs"
                leftSection={t("item.moveResize.field.height.shortLabel")}
                leftSectionPointerEvents="none"
              />
            </Tooltip>
          </Group>
        )}
        <Badge className={classes.previewDimensions} size="xs" variant="light" color="gray">
          {Math.round(sourceWidth)} × {Math.round(sourceHeight)}
        </Badge>
        {isMissingIntegration ? (
          <Alert color="gray" variant="light" icon={<IconEye size={18} />} maw={320}>
            {tItem("preview.integrationRequired")}
          </Alert>
        ) : (
          <Box className={classes.previewViewport} w={previewWidth} h={previewHeight}>
            <WidgetCardShell
              className={classes.previewWidget}
              kind={kind}
              advancedOptions={state.advancedOptions}
              opacity={previewOpacity}
              radius={board?.itemRadius}
              w={sourceWidth}
              h={sourceHeight}
              p={0}
              data-grid-item-content
              style={{ transform: `scale(${previewScale})` }}
            >
              <WidgetTitleBadge
                advancedOptions={state.advancedOptions}
                opacity={previewOpacity}
                radius={board?.itemRadius}
              />
              <QueryErrorResetBoundary>
                {({ reset }) => (
                  <ErrorBoundary
                    onReset={reset}
                    resetKeys={[state.options, state.integrationIds]}
                    fallbackRender={({ resetErrorBoundary, error }) => (
                      <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
                    )}
                  >
                    <PreviewRuntimeBoundary Wrapper={PreviewWrapper}>
                      <SpotlightProvider>
                        <IntegrationProvider integrations={previewIntegrations}>
                          <div className={classes.previewContent} inert>
                            <Component
                              options={state.options as never}
                              integrationIds={state.integrationIds}
                              width={sourceWidth}
                              height={sourceHeight}
                              displayScale={previewScale}
                              isEditMode={isPendingCustomWidget}
                              displayMode="compact"
                              boardId={boardId}
                              itemId={componentItemId}
                              setOptions={({ newOptions }) => onChangeOptions(newOptions as Record<string, unknown>)}
                            />
                          </div>
                        </IntegrationProvider>
                      </SpotlightProvider>
                    </PreviewRuntimeBoundary>
                  </ErrorBoundary>
                )}
              </QueryErrorResetBoundary>
            </WidgetCardShell>
          </Box>
        )}
      </Center>
    </Stack>
  );
};

export const getSelectedWidgetIntegrations = (
  integrationData: readonly IntegrationSelectOption[],
  selectedIds: readonly string[],
) => integrationData.filter((integration) => selectedIds.includes(integration.id));

export const WidgetEditModal = createModal<WidgetEditModalProps<WidgetKind>>(({ actions, innerProps }) => {
  const t = useI18n();
  const tItem = useI18n("item.edit");
  const tCommon = useI18n("common");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const theme = useMantineTheme();
  const appEditRef = useRef<EmbeddedAppEditFormHandle>(null);
  const integrationEditHandles = useRef(new Map<string, EmbeddedIntegrationEditFormHandle>());
  const integrationEditRefCallbacks = useRef(
    new Map<string, (handle: EmbeddedIntegrationEditFormHandle | null) => void>(),
  );
  const [mountedIntegrationIds, setMountedIntegrationIds] = useState<string[]>([]);
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSize, setPreviewSize] = useState<WidgetEditModalSize | null>(() => {
    const resize = innerProps.previewResize;
    if (!resize) return null;
    return normalizePreviewSize(resize.initialSize, resize.maximumSize);
  });
  const widgetFormId = useId();

  z.config({
    customError: zodErrorMap(t),
  });
  const { definition } = innerProps;
  const integrationsRequired =
    innerProps.integrationSupport &&
    (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);
  const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;
  const options = definition.createOptions(innerProps.settings) as Record<string, OptionsBuilderResult[string]>;
  const optionsSuperRefine = (options as Record<symbol, unknown>)[OPTIONS_SUPER_REFINE] as
    | ((data: Record<string, unknown>, ctx: z.RefinementCtx) => void)
    | undefined;
  const optionsFieldSchema = objectEntries(options).reduce(
    (acc, [key, value]: [string, { type: string; validate?: z.ZodType<unknown> }]) => {
      if (value.validate) {
        acc[key] = value.type === "multiText" ? z.array(value.validate).optional() : value.validate;
      }

      return acc;
    },
    {} as Record<string, z.ZodType<unknown>>,
  );
  const optionsSchema = optionsSuperRefine
    ? z.object(optionsFieldSchema).superRefine(optionsSuperRefine)
    : z.object(optionsFieldSchema);

  let integrationIdsSchema = z.array(z.string());
  if (integrationsRequired) integrationIdsSchema = integrationIdsSchema.min(1);
  if (Number.isFinite(maxIntegrations)) integrationIdsSchema = integrationIdsSchema.max(maxIntegrations);

  const form = useForm({
    mode: "controlled",
    initialValues: innerProps.value,
    validate: schemaResolver(
      z.object({
        options: optionsSchema,
        integrationIds: integrationIdsSchema,
        advancedOptions: z.object({
          title: z.string().max(64).nullable(),
          customCssClasses: z.array(z.string()),
          borderColor: z.string(),
        }),
      }),
      { sync: true },
    ),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  const canModifyApps = session?.user.permissions.includes("app-modify-all") ?? false;
  const canConfigureWidget = innerProps.kind !== "customApi" || (session?.user.permissions.includes("admin") ?? false);
  const appId = innerProps.appId;
  const showAppTab = innerProps.kind === "app" && canModifyApps && Boolean(appId);
  const canModifyAllIntegrations = session?.user.permissions.includes("integration-full-all") ?? false;
  const selectedIntegrations = getSelectedWidgetIntegrations(innerProps.integrationData, form.values.integrationIds);
  const editableIntegrationIds = selectedIntegrations
    .filter((integration) => canModifyAllIntegrations || integration.permissions?.hasFullAccess === true)
    .map((integration) => integration.id);
  let soleEditableIntegrationId: string | null = null;
  if (selectedIntegrations.length === 1) {
    soleEditableIntegrationId = editableIntegrationIds[0] ?? null;
  }

  let displayedIntegrationId = soleEditableIntegrationId;
  if (activeIntegrationId && editableIntegrationIds.includes(activeIntegrationId)) {
    displayedIntegrationId = activeIntegrationId;
  }
  const integrationIdsToRender = mountedIntegrationIds.filter((id) => editableIntegrationIds.includes(id));
  if (displayedIntegrationId && !integrationIdsToRender.includes(displayedIntegrationId)) {
    integrationIdsToRender.push(displayedIntegrationId);
  }
  const IntegrationEditForm = innerProps.integrationEditForm;
  const showIntegrationTab = Boolean(IntegrationEditForm) && selectedIntegrations.length > 0;
  const showResourceTabs = showAppTab || showIntegrationTab;
  const [activeTab, setActiveTab] = useState<string | null>("widget");

  useEffect(() => {
    if (activeTab === "integration" && !showIntegrationTab) setActiveTab("widget");
    if (activeTab === "app" && !showAppTab) setActiveTab("widget");
  }, [activeTab, showAppTab, showIntegrationTab]);

  const getIntegrationEditRef = (integrationId: string) => {
    const existingCallback = integrationEditRefCallbacks.current.get(integrationId);
    if (existingCallback) {
      return existingCallback;
    }

    const callback = (handle: EmbeddedIntegrationEditFormHandle | null) => {
      if (handle) {
        integrationEditHandles.current.set(integrationId, handle);
      } else {
        integrationEditHandles.current.delete(integrationId);
      }
    };
    integrationEditRefCallbacks.current.set(integrationId, callback);
    return callback;
  };

  const beginEditingIntegration = (integrationId: string) => {
    setMountedIntegrationIds((current) => {
      if (current.includes(integrationId)) {
        return current;
      }
      return [...current, integrationId];
    });
    setActiveIntegrationId(integrationId);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const appSaved = showAppTab ? await (appEditRef.current?.submitIfDirty() ?? true) : true;

      if (!appSaved) {
        return;
      }

      for (const integrationEditHandle of integrationEditHandles.current.values()) {
        const integrationSaved = await integrationEditHandle.submitIfDirty();
        if (!integrationSaved) {
          return;
        }
      }

      innerProps.onSuccessfulEdit(
        {
          ...values,
          advancedOptions: {
            ...values.advancedOptions,
            title: values.advancedOptions.title?.trim() || null,
          },
        },
        previewSize ?? undefined,
      );
      actions.closeModal();
    } finally {
      setIsSubmitting(false);
    }
  });

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    handleSubmit(event);
  };

  const canCreateIntegration = maxIntegrations === 1 || form.values.integrationIds.length < maxIntegrations;
  const handleOpenNewIntegration = innerProps.onOpenNewIntegration
    ? () => {
        innerProps.onOpenNewIntegration?.((newId) => {
          if (newId) {
            form.setFieldValue("integrationIds", [...(maxIntegrations > 1 ? form.values.integrationIds : []), newId]);
          }
        });
      }
    : undefined;

  const handlePreviewOptionsChange = (newOptions: Record<string, unknown>) => {
    form.setFieldValue("options", {
      ...form.values.options,
      ...newOptions,
    });
  };

  const selectedIntegrationKinds = innerProps.integrationData
    .filter(({ id }) => form.values.integrationIds.includes(id))
    .map(({ kind }) => kind);
  const visibleOptions = Object.entries(options).filter(([, value]) => {
    const Input = getInputForType(value.type);
    if (!Input) {
      return false;
    }

    return !value.shouldHide?.(form.values.options as never, selectedIntegrationKinds);
  });
  const switchOptions = visibleOptions.filter(([, value]) => value.type === "switch");
  const otherOptions = visibleOptions.filter(([, value]) => value.type !== "switch");
  const hasWidgetSettings = canConfigureWidget && (innerProps.integrationSupport || visibleOptions.length > 0);
  const previewResize = innerProps.previewResize;
  let previewDimensions = innerProps.previewDimensions;
  let resizeControls: WidgetEditPreviewProps["resize"];
  if (previewSize && previewResize?.getDimensions) {
    previewDimensions = previewResize.getDimensions(previewSize);
    resizeControls = {
      size: previewSize,
      maximumSize: previewResize.maximumSize,
      onChange: setPreviewSize,
    };
  }

  const widgetFormContent = (
    <Box
      className={classes.workspace}
      data-with-preview={innerProps.previewComponent ? true : undefined}
      data-with-settings
    >
      {innerProps.previewComponent && (
        <WidgetEditPreview
          kind={innerProps.kind}
          Component={innerProps.previewComponent}
          definition={definition}
          state={form.values}
          itemId={innerProps.itemId}
          boardId={innerProps.boardId ?? board?.id}
          dimensions={previewDimensions}
          integrationData={innerProps.integrationData}
          onChangeOptions={handlePreviewOptionsChange}
          resize={resizeControls}
          PreviewWrapper={innerProps.previewWrapper}
        />
      )}
      {innerProps.previewComponent && <Divider orientation="vertical" className={classes.previewDivider} />}
      <form id={widgetFormId} className={classes.settingsForm} onSubmit={onFormSubmit}>
        <Stack className={classes.settingsPanel} gap="sm">
          {hasWidgetSettings && (
            <>
              <Group gap="xs" wrap="nowrap">
                <IconSettings size={16} />
                <Text fw={600} size="sm">
                  {tItem("settings.label")}
                </Text>
              </Group>
              {canConfigureWidget && innerProps.integrationSupport && (
                <Box className={classes.fullWidthField}>
                  <WidgetIntegrationSelect
                    label={tItem("field.integrations.label")}
                    data={innerProps.integrationData}
                    canSelectMultiple={maxIntegrations > 1}
                    withAsterisk={integrationsRequired}
                    onOpenNewIntegration={canCreateIntegration ? handleOpenNewIntegration : undefined}
                    {...form.getInputProps("integrationIds")}
                  />
                </Box>
              )}
              {canConfigureWidget && (
                <Stack gap="sm">
                  {switchOptions.length > 0 && (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
                      {switchOptions.map(([key, value]) => {
                        const Input = getInputForType(value.type);
                        if (!Input) {
                          return null;
                        }

                        return (
                          <Box
                            key={key}
                            className={classes.switchOption}
                            data-option-type={value.type}
                            onClick={(event) => {
                              const target = event.target;
                              if (target instanceof Element && target.closest("label, input")) return;
                              const input = event.currentTarget.querySelector<HTMLInputElement>("input[type=checkbox]");
                              if (!input?.disabled) input?.click();
                            }}
                          >
                            <Input
                              kind={innerProps.kind}
                              property={key}
                              options={value as never}
                              initialOptions={innerProps.value.options}
                              itemId={innerProps.itemId}
                              boardId={innerProps.boardId ?? board?.id}
                            />
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  )}
                  {otherOptions.map(([key, value]) => {
                    const Input = getInputForType(value.type);
                    if (!Input) {
                      return null;
                    }

                    return (
                      <Box key={key} data-option-type={value.type}>
                        <Input
                          kind={innerProps.kind}
                          property={key}
                          options={value as never}
                          initialOptions={innerProps.value.options}
                          itemId={innerProps.itemId}
                          boardId={innerProps.boardId ?? board?.id}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </>
          )}
          <Accordion variant="contained">
            <Accordion.Item value="advanced-options">
              <Accordion.Control>{tItem("advancedOptions.label")}</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <TextInput
                    label={tItem("field.title.label")}
                    rightSection={
                      <MantineInput.ClearButton
                        onClick={() => form.setFieldValue("advancedOptions.title", "")}
                        disabled={!form.values.advancedOptions.title}
                      />
                    }
                    {...form.getInputProps("advancedOptions.title")}
                  />
                  <TextMultiSelect
                    label={tItem("field.customCssClasses.label")}
                    {...form.getInputProps("advancedOptions.customCssClasses")}
                  />
                  <ColorInput
                    label={tItem("field.borderColor.label")}
                    format="hex"
                    swatches={Object.values(theme.colors).map((color) => color[6])}
                    rightSection={
                      <CloseButton
                        aria-label={tCommon("action.remove")}
                        onClick={() => form.setFieldValue("advancedOptions.borderColor", "")}
                        style={{ display: form.values.advancedOptions.borderColor ? undefined : "none" }}
                      />
                    }
                    {...form.getInputProps("advancedOptions.borderColor")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </form>
    </Box>
  );

  const footer = (
    <Box className={classes.footer}>
      <Group justify="end" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" form={widgetFormId} loading={isSubmitting}>
            {tCommon("action.saveChanges")}
          </Button>
        </Group>
      </Group>
    </Box>
  );

  return (
    <FormProvider form={form}>
      <Stack gap="sm">
        {showResourceTabs ? (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List grow>
              <Tabs.Tab value="widget">{tItem("tab.widget")}</Tabs.Tab>
              {showAppTab && <Tabs.Tab value="app">{tItem("tab.app")}</Tabs.Tab>}
              {showIntegrationTab && <Tabs.Tab value="integration">{tItem("tab.integration")}</Tabs.Tab>}
            </Tabs.List>
            <Tabs.Panel value="widget" pt="sm">
              {widgetFormContent}
            </Tabs.Panel>
            {showAppTab && (
              <Tabs.Panel value="app" pt="sm">
                {appId && <EmbeddedAppEditForm appId={appId} handleRef={appEditRef} />}
              </Tabs.Panel>
            )}
            {showIntegrationTab && (
              <Tabs.Panel value="integration" pt="sm">
                <Stack>
                  {displayedIntegrationId === null && (
                    <>
                      <Text size="sm" c="dimmed">
                        {tItem("integration.description")}
                      </Text>
                      {selectedIntegrations.map((integration) => {
                        const canEdit = editableIntegrationIds.includes(integration.id);
                        return (
                          <Group key={integration.id} justify="space-between" wrap="nowrap" gap="sm">
                            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                              <IntegrationAvatar kind={integration.kind} size="sm" />
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text fw={600} size="sm" truncate>
                                  {integration.name}
                                </Text>
                                <Text size="xs" c="dimmed" truncate>
                                  {integration.url}
                                </Text>
                              </Stack>
                            </Group>
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="light"
                                leftSection={<IconPencil size={16} />}
                                onClick={() => beginEditingIntegration(integration.id)}
                                aria-label={tItem("integration.editLabel", { name: integration.name })}
                              >
                                {tItem("integration.action")}
                              </Button>
                            ) : (
                              <Text size="xs" c="dimmed" ta="end">
                                {tItem("integration.fullAccessRequired")}
                              </Text>
                            )}
                          </Group>
                        );
                      })}
                    </>
                  )}
                  {displayedIntegrationId !== null && selectedIntegrations.length > 1 && (
                    <Button
                      type="button"
                      variant="subtle"
                      leftSection={<IconArrowLeft size={16} />}
                      onClick={() => setActiveIntegrationId(null)}
                      style={{ alignSelf: "start" }}
                    >
                      {tCommon("action.previous")}
                    </Button>
                  )}
                  {integrationIdsToRender.map((integrationId) => (
                    <Box key={integrationId} hidden={displayedIntegrationId !== integrationId}>
                      {IntegrationEditForm && (
                        <IntegrationEditForm
                          integrationId={integrationId}
                          handleRef={getIntegrationEditRef(integrationId)}
                          onSuccess={innerProps.onIntegrationSaved}
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              </Tabs.Panel>
            )}
          </Tabs>
        ) : (
          widgetFormContent
        )}
        {footer}
      </Stack>
    </FormProvider>
  );
}).withOptions({
  keepMounted: true,
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: modalSizeForm,
  closeOnClickOutside: false,
});
