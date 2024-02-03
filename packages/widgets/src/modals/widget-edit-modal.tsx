"use client";

import type { ManagedModal } from "mantine-modal-manager";

import type { WidgetKind } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { Button, Group, Stack } from "@homarr/ui";

import { widgetImports } from "..";
import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { WidgetOptionDefinition } from "../options";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetIntegrationSelect } from "../widget-integration-select";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrations: string[];
}

interface ModalProps<TSort extends WidgetKind> {
  kind: TSort;
  value: WidgetEditModalState;
  onSuccessfulEdit: (value: WidgetEditModalState) => void;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
}

export const WidgetEditModal: ManagedModal<ModalProps<WidgetKind>> = ({
  actions,
  innerProps,
}) => {
  const t = useScopedI18n("widget.editModal");
  const form = useForm({
    initialValues: innerProps.value,
  });

  const { definition } = widgetImports[innerProps.kind];

  return (
    <form
      onSubmit={form.onSubmit((v) => {
        innerProps.onSuccessfulEdit(v);
        actions.closeModal();
      })}
    >
      <FormProvider form={form}>
        <Stack>
          {innerProps.integrationSupport && (
            <WidgetIntegrationSelect
              label={t("integrations.label")}
              data={innerProps.integrationData}
              {...form.getInputProps("integrations")}
            />
          )}
          {Object.entries(definition.options).map(
            ([key, value]: [string, WidgetOptionDefinition]) => {
              const Input = getInputForType(value.type);

              if (!Input) {
                return null;
              }

              return (
                <Input
                  key={key}
                  kind={innerProps.kind}
                  property={key}
                  options={value as never}
                />
              );
            },
          )}
          <Group justify="right">
            <Button onClick={actions.closeModal} variant="subtle" color="gray">
              Close
            </Button>
            <Button type="submit" color="teal">
              Save
            </Button>
          </Group>
        </Stack>
      </FormProvider>
    </form>
  );
};
