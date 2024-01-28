"use client";

import type { ManagedModal } from "mantine-modal-manager";

import type { WidgetKind } from "@homarr/definitions";
import { Button, Group, Stack } from "@homarr/ui";

import { widgetImports } from ".";
import { getInputForType } from "./_inputs";
import { FormProvider, useForm } from "./_inputs/form";
import type { WidgetOptionDefinition } from "./options";

interface ModalProps<TKind extends WidgetKind> {
  kind: TKind;
  value: Record<string, unknown>;
  onSuccessfulEdit: (value: Record<string, unknown>) => void;
}

export const WidgetEditModal: ManagedModal<ModalProps<WidgetKind>> = ({
  actions,
  innerProps,
}) => {
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
