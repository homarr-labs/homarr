"use client";

/* eslint-disable react/no-unstable-nested-components -- Widget modules and definition-bound fallbacks are loaded dynamically. */

import { useEffect, useRef, useState } from "react";
import type { ComponentType, FormEvent } from "react";
import { Alert, Badge, Box, Button, Card, Center, Group, SimpleGrid, Stack, Tabs, Text } from "@mantine/core";
import { schemaResolver } from "@mantine/form";
import { useElementSize } from "@mantine/hooks";
import { IconArrowLeft, IconEye, IconPencil, IconSettings } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common";
import { useSession } from "@homarr/auth/client";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";
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
import { WidgetAdvancedOptionsModal } from "./widget-advanced-options-modal";
import type { EmbeddedAppEditFormHandle } from "./embedded-app-edit-form";
import { EmbeddedAppEditForm } from "./embedded-app-edit-form";
import classes from "./widget-edit-modal.module.css";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrationIds: string[];
  advancedOptions: BoardItemAdvancedOptions;
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
  onSuccessfulEdit: (value: WidgetEditModalState) => void;
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
  previewDimensions?: { width: number; height: number };
}

interface WidgetEditPreviewProps {
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
  definition: WidgetDefinition;
  state: WidgetEditModalState;
  itemId?: string;
  boardId?: string;
  dimensions?: { width: number; height: number };
  onChangeOptions: (newOptions: Record<string, unknown>) => void;
}

const WidgetEditPreview = ({
  Component,
  definition,
  state,
  itemId,
  boardId,
  dimensions = { width: 400, height: 240 },
  onChangeOptions,
}: WidgetEditPreviewProps) => {
  const tItem = useI18n("item.edit");
  const { ref, width: availableWidth } = useElementSize<HTMLDivElement>();
  const sourceWidth = Math.max(dimensions.width, 1);
  const sourceHeight = Math.max(dimensions.height, 1);
  const aspectRatio = sourceWidth / sourceHeight;
  const maximumWidth = Math.max(availableWidth, 280);
  let previewWidth = maximumWidth;
  let previewHeight = previewWidth / aspectRatio;

  if (previewHeight > 320) {
    previewHeight = 320;
    previewWidth = previewHeight * aspectRatio;
  }

  const hasIntegrationSupport = "supportedIntegrations" in definition;
  const integrationRequired = hasIntegrationSupport && definition.integrationsRequired !== false;
  const isMissingIntegration = integrationRequired && state.integrationIds.length === 0;

  return (
    <Stack className={classes.previewPanel} gap="sm">
      <Badge className={classes.previewDimensions} size="xs" variant="light" color="gray">
        {Math.round(sourceWidth)} × {Math.round(sourceHeight)}
      </Badge>
      <Center ref={ref} className={classes.previewCanvas}>
        {isMissingIntegration ? (
          <Alert color="gray" variant="light" icon={<IconEye size={18} />} maw={320}>
            {tItem("preview.integrationRequired")}
          </Alert>
        ) : (
          <Card
            className={classes.previewWidget}
            w={previewWidth}
            h={previewHeight}
            p={previewHeight >= 96 ? undefined : 4}
            style={{ borderColor: state.advancedOptions.borderColor || undefined }}
          >
            {state.advancedOptions.title && (
              <Badge className={classes.previewTitle} size="sm" variant="default">
                {state.advancedOptions.title}
              </Badge>
            )}
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary
                  onReset={reset}
                  resetKeys={[state.options, state.integrationIds]}
                  fallbackRender={({ resetErrorBoundary, error }) => (
                    <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
                  )}
                >
                  <div className={classes.previewContent} inert>
                    <Component
                      options={state.options as never}
                      integrationIds={state.integrationIds}
                      width={previewWidth}
                      height={previewHeight}
                      isEditMode={false}
                      boardId={boardId}
                      itemId={itemId}
                      setOptions={({ newOptions }) => onChangeOptions(newOptions as Record<string, unknown>)}
                    />
                  </div>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </Card>
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
  const [advancedOptions, setAdvancedOptions] = useState<BoardItemAdvancedOptions>(innerProps.value.advancedOptions);
  const appEditRef = useRef<EmbeddedAppEditFormHandle>(null);
  const integrationEditHandles = useRef(new Map<string, EmbeddedIntegrationEditFormHandle>());
  const integrationEditRefCallbacks = useRef(
    new Map<string, (handle: EmbeddedIntegrationEditFormHandle | null) => void>(),
  );
  const [mountedIntegrationIds, setMountedIntegrationIds] = useState<string[]>([]);
  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          customCssClasses: z.array(z.string()),
          borderColor: z.string(),
        }),
      }),
      { sync: true },
    ),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });
  const { openModal } = useModalAction(WidgetAdvancedOptionsModal);

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

      innerProps.onSuccessfulEdit({
        ...values,
        advancedOptions,
      });
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

  const widgetFormContent = (
    <Box className={classes.workspace} data-with-preview={innerProps.previewComponent ? true : undefined}>
      {innerProps.previewComponent && (
        <WidgetEditPreview
          Component={innerProps.previewComponent}
          definition={definition}
          state={{ ...form.values, advancedOptions }}
          itemId={innerProps.itemId}
          boardId={innerProps.boardId ?? board?.id}
          dimensions={innerProps.previewDimensions}
          onChangeOptions={handlePreviewOptionsChange}
        />
      )}
      <Stack className={classes.settingsPanel} gap="sm">
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
                    <Box key={key} className={classes.switchOption} data-option-type={value.type}>
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
      </Stack>
    </Box>
  );

  const footer = (
    <Box className={classes.footer}>
      <Group justify="space-between" wrap="nowrap">
        <Button
          variant="subtle"
          type="button"
          onClick={() =>
            openModal({
              advancedOptions,
              onSuccess: setAdvancedOptions,
            })
          }
        >
          {tItem("advancedOptions.label")}
        </Button>
        <Group gap="xs" wrap="nowrap">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {tCommon("action.saveChanges")}
          </Button>
        </Group>
      </Group>
    </Box>
  );

  return (
    <form onSubmit={onFormSubmit}>
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
    </form>
  );
}).withOptions({
  keepMounted: true,
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: modalSizeSelect,
  transitionProps: {
    transition: "pop",
    duration: 180,
  },
  closeOnClickOutside: false,
});
