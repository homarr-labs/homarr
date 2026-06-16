"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button, Group, Stack, Tabs } from "@mantine/core";
import { schemaResolver } from "@mantine/form";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common";
import { useSession } from "@homarr/auth/client";
import type { WidgetKind } from "@homarr/definitions";
import { createModal, ModalFormFooter, modalSizeForm, useModalAction } from "@homarr/modals";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form/i18n";

import { widgetImports } from "..";
import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { BoardItemAdvancedOptions } from "../../../validation/src/shared";
import type { OptionsBuilderResult } from "../options";
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

interface ModalProps<TSort extends WidgetKind> {
  kind: TSort;
  value: WidgetEditModalState;
  onSuccessfulEdit: (value: WidgetEditModalState) => void;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
  settings: SettingsContextProps;
  appId?: string;
}

export const WidgetEditModal = createModal<ModalProps<WidgetKind>>(({ actions, innerProps }) => {
  const t = useI18n();
  const { data: session } = useSession();
  const [advancedOptions, setAdvancedOptions] = useState<BoardItemAdvancedOptions>(innerProps.value.advancedOptions);
  const appEditRef = useRef<EmbeddedAppEditFormHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  z.config({
    customError: zodErrorMap(t),
  });
  const { definition } = widgetImports[innerProps.kind];
  const options = definition.createOptions(innerProps.settings) as Record<string, OptionsBuilderResult[string]>;

  const form = useForm({
    mode: "controlled",
    initialValues: innerProps.value,
    validate: schemaResolver(
      z.object({
        options: z.object(
          objectEntries(options).reduce(
            (acc, [key, value]: [string, { type: string; validate?: z.ZodType<unknown> }]) => {
              if (value.validate) {
                acc[key] = value.type === "multiText" ? z.array(value.validate).optional() : value.validate;
              }

              return acc;
            },
            {} as Record<string, z.ZodType<unknown>>,
          ),
        ),
        integrationIds: z.array(z.string()),
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
  const appId = innerProps.appId;
  const showAppTab = innerProps.kind === "app" && canModifyApps && Boolean(appId);

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
      {innerProps.integrationSupport && (
        <WidgetIntegrationSelect
          label={t("item.edit.field.integrations.label")}
          data={innerProps.integrationData}
          canSelectMultiple={
            ((widgetImports[innerProps.kind].definition as { maxIntegrations?: number }).maxIntegrations ?? Infinity) >
            1
          }
          {...form.getInputProps("integrationIds")}
        />
      )}
      {Object.entries(options).map(([key, value]) => {
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
          />
        );
      })}
      {showAppTab ? (
        <Button
          variant="subtle"
          type="button"
          onClick={() =>
            openModal({
              advancedOptions,
              onSuccess(options) {
                setAdvancedOptions(options);
                innerProps.onSuccessfulEdit({
                  ...innerProps.value,
                  advancedOptions: options,
                });
              },
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
                  onSuccess(options) {
                    setAdvancedOptions(options);
                    innerProps.onSuccessfulEdit({
                      ...innerProps.value,
                      advancedOptions: options,
                    });
                  },
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
        {showAppTab ? (
          <Stack>
            <Tabs defaultValue="widget">
              <Tabs.List grow>
                <Tabs.Tab value="widget">{t("item.edit.tab.widget")}</Tabs.Tab>
                <Tabs.Tab value="app">{t("item.edit.tab.app")}</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="widget" pt="md">
                {widgetFormContent}
              </Tabs.Panel>
              <Tabs.Panel value="app" pt="md">
                {appId && <EmbeddedAppEditForm appId={appId} handleRef={appEditRef} />}
              </Tabs.Panel>
            </Tabs>
            <Group justify="end">
              <Button onClick={actions.closeModal} variant="subtle" color="gray">
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {t("common.action.saveChanges")}
              </Button>
            </Group>
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
});
