"use client";

import { useEffect } from "react";
import type { FormEvent } from "react";
import {
  Accordion,
  Box,
  CloseButton,
  ColorInput,
  Group,
  Input as MantineInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { schemaResolver } from "@mantine/form";
import { IconSettings } from "@tabler/icons-react";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import { zodErrorMap } from "@homarr/validation/form/i18n";

import { getInputForType } from "../_inputs";
import { FormProvider, useForm, useFormContext } from "../_inputs/form";
import type { WidgetDefinition } from "../definition";
import type { OptionsBuilderResult } from "../options";
import { OPTIONS_SUPER_REFINE } from "../options";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import classes from "./widget-edit-modal.module.css";
import type { WidgetEditModalState } from "./widget-edit-modal";

export const getWidgetIntegrationsRequired = (definition: WidgetDefinition, integrationSupport: boolean) =>
  integrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false);

export const getWidgetMaxIntegrations = (definition: WidgetDefinition) =>
  "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;

interface UseWidgetEditorFormProps {
  definition: WidgetDefinition;
  value: WidgetEditModalState;
  integrationSupport: boolean;
  settings: SettingsContextProps;
}

export const useWidgetEditorForm = ({ definition, value, integrationSupport, settings }: UseWidgetEditorFormProps) => {
  const t = useI18n();
  z.config({
    customError: zodErrorMap(t),
  });
  const integrationsRequired = getWidgetIntegrationsRequired(definition, integrationSupport);
  const maxIntegrations = getWidgetMaxIntegrations(definition);
  const options = definition.createOptions(settings) as Record<string, OptionsBuilderResult[string]>;
  const optionsSuperRefine = (options as Record<symbol, unknown>)[OPTIONS_SUPER_REFINE] as
    | ((data: Record<string, unknown>, ctx: z.RefinementCtx) => void)
    | undefined;
  const optionsFieldSchema = objectEntries(options).reduce(
    (acc, [key, option]: [string, { type: string; validate?: z.ZodType<unknown> }]) => {
      if (option.validate) {
        acc[key] = option.type === "multiText" ? z.array(option.validate).optional() : option.validate;
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

  return useForm({
    mode: "controlled",
    initialValues: value,
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
};

export const normalizeWidgetEditorState = (state: WidgetEditModalState): WidgetEditModalState => ({
  ...state,
  advancedOptions: {
    ...state.advancedOptions,
    title: state.advancedOptions.title?.trim() || null,
  },
});

interface WidgetEditorFieldsProps {
  kind: WidgetKind;
  definition: WidgetDefinition;
  initialOptions: Record<string, unknown>;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
  settings: SettingsContextProps;
  itemId?: string;
  boardId?: string;
  formId?: string;
  canConfigureWidget?: boolean;
  showSettingsHeading?: boolean;
  onOpenNewIntegration?: (onCreated?: (id: string) => void) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const WidgetEditorFields = ({
  kind,
  definition,
  initialOptions,
  integrationData,
  integrationSupport,
  settings,
  itemId,
  boardId,
  formId,
  canConfigureWidget = true,
  showSettingsHeading = true,
  onOpenNewIntegration,
  onSubmit,
}: WidgetEditorFieldsProps) => {
  const tItem = useI18n("item.edit");
  const tCommon = useI18n("common");
  const board = useOptionalBoard();
  const theme = useMantineTheme();
  const form = useFormContext();
  const integrationsRequired = getWidgetIntegrationsRequired(definition, integrationSupport);
  const maxIntegrations = getWidgetMaxIntegrations(definition);
  const options = definition.createOptions(settings) as Record<string, OptionsBuilderResult[string]>;
  const canCreateIntegration = maxIntegrations === 1 || form.values.integrationIds.length < maxIntegrations;
  const handleOpenNewIntegration = onOpenNewIntegration
    ? () => {
        onOpenNewIntegration((newId) => {
          if (newId) {
            form.setFieldValue("integrationIds", [...(maxIntegrations > 1 ? form.values.integrationIds : []), newId]);
          }
        });
      }
    : undefined;

  const selectedIntegrationKinds = integrationData
    .filter(({ id }) => form.values.integrationIds.includes(id))
    .map(({ kind: integrationKind }) => integrationKind);
  const visibleOptions = Object.entries(options).filter(([, value]) => {
    const Input = getInputForType(value.type);
    if (!Input) {
      return false;
    }

    return !value.shouldHide?.(form.values.options as never, selectedIntegrationKinds);
  });
  const switchOptions = visibleOptions.filter(([, value]) => value.type === "switch");
  const otherOptions = visibleOptions.filter(([, value]) => value.type !== "switch");
  const hasWidgetSettings = canConfigureWidget && (integrationSupport || visibleOptions.length > 0);

  return (
    <form id={formId} className={classes.settingsForm} onSubmit={onSubmit}>
      <Stack className={classes.settingsPanel} gap="sm">
        {hasWidgetSettings && (
          <>
            {showSettingsHeading && (
              <Group gap="xs" wrap="nowrap">
                <IconSettings size={16} />
                <Text fw={600} size="sm">
                  {tItem("settings.label")}
                </Text>
              </Group>
            )}
            {canConfigureWidget && integrationSupport && (
              <Box className={classes.fullWidthField}>
                <WidgetIntegrationSelect
                  label={tItem("field.integrations.label")}
                  data={integrationData}
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
                  <SimpleGrid type="container" cols={{ base: 1, "32rem": 2 }} spacing="xs" verticalSpacing="xs">
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
                            kind={kind}
                            property={key}
                            options={value as never}
                            initialOptions={initialOptions}
                            itemId={itemId}
                            boardId={boardId ?? board?.id}
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
                        kind={kind}
                        property={key}
                        options={value as never}
                        initialOptions={initialOptions}
                        itemId={itemId}
                        boardId={boardId ?? board?.id}
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
            <Accordion.Control data-widget-advanced-options>{tItem("advancedOptions.label")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label={tCommon("field.title")}
                  rightSection={
                    <MantineInput.ClearButton
                      onClick={() => form.setFieldValue("advancedOptions.title", "")}
                      disabled={!form.values.advancedOptions.title}
                    />
                  }
                  {...form.getInputProps("advancedOptions.title")}
                  value={form.values.advancedOptions.title ?? ""}
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
  );
};

export interface WidgetEditorFormProps {
  kind: WidgetKind;
  definition: WidgetDefinition;
  value: WidgetEditModalState;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
  settings: SettingsContextProps;
  itemId?: string;
  boardId?: string;
  formId?: string;
  canConfigureWidget?: boolean;
  showSettingsHeading?: boolean;
  onOpenNewIntegration?: (onCreated?: (id: string) => void) => void;
  onChange?: (draft: WidgetEditModalState) => void;
  onSubmit: (draft: WidgetEditModalState) => void;
}

export const WidgetEditorForm = ({
  kind,
  definition,
  value,
  integrationData,
  integrationSupport,
  settings,
  itemId,
  boardId,
  formId,
  canConfigureWidget,
  showSettingsHeading,
  onOpenNewIntegration,
  onChange,
  onSubmit,
}: WidgetEditorFormProps) => {
  const form = useWidgetEditorForm({ definition, value, integrationSupport, settings });

  useEffect(() => {
    onChange?.(form.values);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values]);

  const handleSubmit = form.onSubmit(
    (values) => onSubmit(normalizeWidgetEditorState(values)),
    (errors, _values, event) => {
      const element = event?.currentTarget;
      const firstError = Object.keys(errors)[0];
      if (!firstError) return;
      requestAnimationFrame(() => {
        if (firstError.startsWith("advancedOptions.")) {
          element?.querySelector<HTMLButtonElement>('[data-widget-advanced-options][aria-expanded="false"]')?.click();
        }
        requestAnimationFrame(() => {
          const field = form.getInputNode(firstError) ?? element?.querySelector<HTMLElement>("[aria-invalid=true]");
          const input = field?.querySelector<HTMLElement>("input, textarea, select, [contenteditable=true]") ?? field;
          input?.focus();
          input?.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      });
    },
  );

  return (
    <FormProvider form={form}>
      <WidgetEditorFields
        kind={kind}
        definition={definition}
        initialOptions={value.options}
        integrationData={integrationData}
        integrationSupport={integrationSupport}
        settings={settings}
        itemId={itemId}
        boardId={boardId}
        formId={formId}
        canConfigureWidget={canConfigureWidget}
        showSettingsHeading={showSettingsHeading}
        onOpenNewIntegration={onOpenNewIntegration}
        onSubmit={(event) => handleSubmit(event)}
      />
    </FormProvider>
  );
};
