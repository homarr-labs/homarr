"use client";

import { useState } from "react";
import { Button, Group, Stack } from "@mantine/core";

import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { zodResolver } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { z } from "@homarr/validation";
import { zodErrorMap } from "@homarr/validation/form";

import { widgetImports } from "..";
import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { BoardItemAdvancedOptions } from "../../../validation/src/shared";
import type { OptionsBuilderResult } from "../options";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import { WidgetAdvancedOptionsModal } from "./widget-advanced-options-modal";

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
}

export const WidgetEditModal = createModal<ModalProps<WidgetKind>>(({ actions, innerProps }) => {
  const t = useI18n();
  const [advancedOptions, setAdvancedOptions] = useState<BoardItemAdvancedOptions>(innerProps.value.advancedOptions);

  // Translate the error messages
  z.setErrorMap(zodErrorMap(t));
  const form = useForm({
    mode: "controlled",
    initialValues: innerProps.value,
    validate: zodResolver(
      z.object({
        options: z.object(
          objectEntries(widgetImports[innerProps.kind].definition.options).reduce(
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
        }),
      }),
    ),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });
  const { openModal } = useModalAction(WidgetAdvancedOptionsModal);

  const { definition } = widgetImports[innerProps.kind];

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        innerProps.onSuccessfulEdit({
          ...values,
          advancedOptions,
        });
        actions.closeModal();
      })}
    >
      <FormProvider form={form}>
        <Stack>
          {innerProps.integrationSupport && (
            <WidgetIntegrationSelect
              label={t("item.edit.field.integrations.label")}
              data={innerProps.integrationData}
              {...form.getInputProps("integrationIds")}
            />
          )}
          {Object.entries(definition.options).map(([key, value]: [string, OptionsBuilderResult[string]]) => {
            const Input = getInputForType(value.type);

            if (
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              !Input ||
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
          <Group justify="space-between">
            <Button
              variant="subtle"
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
            <Group justify="end" w={{ base: "100%", xs: "auto" }}>
              <Button onClick={actions.closeModal} variant="subtle" color="gray">
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" color="teal">
                {t("common.action.saveChanges")}
              </Button>
            </Group>
          </Group>
        </Stack>
      </FormProvider>
    </form>
  );
}).withOptions({
  keepMounted: true,
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: "lg",
});
