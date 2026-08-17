"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Box, Button, Group, Stack, Tabs, Text } from "@mantine/core";
import { schemaResolver } from "@mantine/form";
import { IconPencil } from "@tabler/icons-react";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common";
import { useSession } from "@homarr/auth/client";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { createModal, ModalFormFooter, modalSizeForm, useModalAction } from "@homarr/modals";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";
import { zodErrorMap } from "@homarr/validation/form/i18n";

import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { BoardItemAdvancedOptions } from "../../../validation/src/shared";
import type { OptionsBuilderResult } from "../options";
import type { WidgetDefinition } from "../definition";
import { OPTIONS_SUPER_REFINE } from "../options";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import { WidgetAdvancedOptionsModal } from "./widget-advanced-options-modal";
import type { EmbeddedAppEditFormHandle } from "./embedded-app-edit-form";
import { EmbeddedAppEditForm } from "./embedded-app-edit-form";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrationIds: string[];
  advancedOptions: BoardItemAdvancedOptions;
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
  onEditIntegration?: (integrationId: string) => void;
  onIntegrationSaved?: () => void;
}

export const getSelectedWidgetIntegrations = (
  integrationData: readonly IntegrationSelectOption[],
  selectedIds: readonly string[],
) => integrationData.filter((integration) => selectedIds.includes(integration.id));

export const WidgetEditModal = createModal<WidgetEditModalProps<WidgetKind>>(({ actions, innerProps }) => {
  const t = useI18n();
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const [advancedOptions, setAdvancedOptions] = useState<BoardItemAdvancedOptions>(innerProps.value.advancedOptions);
  const appEditRef = useRef<EmbeddedAppEditFormHandle>(null);
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
  const showIntegrationTab = Boolean(innerProps.onEditIntegration) && selectedIntegrations.length > 0;
  const showResourceTabs = showAppTab || showIntegrationTab;
  const [activeTab, setActiveTab] = useState<string | null>("widget");

  useEffect(() => {
    if (activeTab === "integration" && !showIntegrationTab) setActiveTab("widget");
    if (activeTab === "app" && !showAppTab) setActiveTab("widget");
  }, [activeTab, showAppTab, showIntegrationTab]);

  const handleTabChange = (value: string | null) => {
    if (value === "integration" && selectedIntegrations.length === 1) {
      const integration = selectedIntegrations[0];
      if (integration) {
        innerProps.onEditIntegration?.(integration.id);
        return;
      }
    }
    setActiveTab(value);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const appSaved = showAppTab ? await (appEditRef.current?.submitIfDirty() ?? true) : true;

      if (!appSaved) {
        return;
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

  const widgetFormContent = (
    <Stack>
      {canConfigureWidget && innerProps.integrationSupport && (
        <WidgetIntegrationSelect
          label={t("item.edit.field.integrations.label")}
          data={innerProps.integrationData}
          canSelectMultiple={maxIntegrations > 1}
          withAsterisk={integrationsRequired}
          {...form.getInputProps("integrationIds")}
        />
      )}
      {canConfigureWidget &&
        Object.entries(options).map(([key, value]) => {
          const Input = getInputForType(value.type);

          if (
            !Input ||
            value.shouldHide?.(
              form.values.options as never,
              innerProps.integrationData
                .filter(({ id }) => form.values.integrationIds.includes(id))
                .map(({ kind }) => kind),
            )
          ) {
            return null;
          }

          return (
            <Input
              key={key}
              kind={innerProps.kind}
              property={key}
              options={value as never}
              initialOptions={innerProps.value.options}
              itemId={innerProps.itemId}
              boardId={innerProps.boardId ?? board?.id}
            />
          );
        })}
      {showResourceTabs ? (
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
          {t("item.edit.advancedOptions.label")}
        </Button>
      ) : (
        <ModalFormFooter
          onCancel={actions.closeModal}
          leftSection={
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
              {t("item.edit.advancedOptions.label")}
            </Button>
          }
        />
      )}
    </Stack>
  );

  return (
    <form onSubmit={onFormSubmit}>
      <FormProvider form={form}>
        {showResourceTabs ? (
          <Stack>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tabs.List grow>
                <Tabs.Tab value="widget">{t("item.edit.tab.widget")}</Tabs.Tab>
                {showAppTab && <Tabs.Tab value="app">{t("item.edit.tab.app")}</Tabs.Tab>}
                {showIntegrationTab && <Tabs.Tab value="integration">{t("item.edit.tab.integration")}</Tabs.Tab>}
              </Tabs.List>
              <Tabs.Panel value="widget" pt="md">
                {widgetFormContent}
              </Tabs.Panel>
              {showAppTab && (
                <Tabs.Panel value="app" pt="md">
                  {appId && <EmbeddedAppEditForm appId={appId} handleRef={appEditRef} />}
                </Tabs.Panel>
              )}
              {showIntegrationTab && (
                <Tabs.Panel value="integration" pt="md">
                  <Stack>
                    <Text size="sm" c="dimmed">
                      {t("item.edit.integration.description")}
                    </Text>
                    {selectedIntegrations.map((integration) => {
                      const canEdit = canModifyAllIntegrations || integration.permissions?.hasFullAccess === true;
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
                              onClick={() => innerProps.onEditIntegration?.(integration.id)}
                              aria-label={t("item.edit.integration.editLabel", { name: integration.name })}
                            >
                              {t("item.edit.integration.action")}
                            </Button>
                          ) : (
                            <Text size="xs" c="dimmed" ta="end">
                              {t("item.edit.integration.fullAccessRequired")}
                            </Text>
                          )}
                        </Group>
                      );
                    })}
                  </Stack>
                </Tabs.Panel>
              )}
            </Tabs>
            <Box
              pos="sticky"
              bottom={0}
              style={{
                marginInline: "calc(var(--mantine-spacing-md) * -1)",
                marginBottom: "calc(var(--mantine-spacing-md) * -1)",
                paddingInline: "var(--mantine-spacing-md)",
                paddingBlock: "var(--mantine-spacing-sm)",
                background: "var(--mantine-color-body)",
                borderTop: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Group justify="end">
                <Button onClick={actions.closeModal} variant="subtle" color="gray">
                  {t("common.action.cancel")}
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {t("common.action.saveChanges")}
                </Button>
              </Group>
            </Box>
          </Stack>
        ) : (
          widgetFormContent
        )}
      </FormProvider>
    </form>
  );
}).withOptions({
  keepMounted: true,
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: modalSizeForm,
  presentation: "inspector",
  closeOnClickOutside: false,
});
