"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedModal } from "mantine-modal-manager";

import { Button, Group, Stack } from "@homarr/ui";

import type { WidgetSort } from "..";
import { getInputForType } from "../_inputs";
import { FormProvider, useForm } from "../_inputs/form";
import type { WidgetOptionsRecordOf } from "../definition";
import type { WidgetOptionDefinition } from "../options";
import { WidgetIntegrationSelect } from "../widget-integration-select";
import type { IntegrationSelectOption } from "../widget-integration-select";

export interface WidgetEditModalState {
  options: Record<string, unknown>;
  integrations: string[];
}

interface ModalProps<TSort extends WidgetSort> {
  sort: TSort;
  state: [WidgetEditModalState, Dispatch<SetStateAction<WidgetEditModalState>>];
  definition: WidgetOptionsRecordOf<TSort>;
  integrationData: IntegrationSelectOption[];
  integrationSupport: boolean;
}

export const WidgetEditModal: ManagedModal<ModalProps<WidgetSort>> = ({
  actions,
  innerProps,
}) => {
  const [value, setValue] = innerProps.state;
  const form = useForm({
    initialValues: value,
  });

  return (
    <form
      onSubmit={form.onSubmit((v) => {
        setValue(v);
        actions.closeModal();
      })}
    >
      <FormProvider form={form}>
        <Stack>
          {innerProps.integrationSupport && (
            <WidgetIntegrationSelect
              label="Integrations"
              data={innerProps.integrationData}
              {...form.getInputProps("integrations")}
            />
          )}
          {Object.entries(innerProps.definition).map(
            ([key, value]: [string, WidgetOptionDefinition]) => {
              const Input = getInputForType(value.type);

              if (!Input) {
                return null;
              }

              return (
                <Input
                  key={key}
                  sort={innerProps.sort}
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
