"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedModal } from "mantine-modal-manager";

import type { WidgetKind } from "@homarr/definitions";
import { Button, Group, Stack } from "@homarr/ui";

import { getInputForType } from "./_inputs";
import { FormProvider, useForm } from "./_inputs/form";
import type { WidgetOptionsRecordOf } from "./definition";
import type { WidgetOptionDefinition } from "./options";

interface ModalProps<TKind extends WidgetKind> {
  kind: TKind;
  state: [
    Record<string, unknown>,
    Dispatch<SetStateAction<Record<string, unknown>>>,
  ];
  definition: WidgetOptionsRecordOf<TKind>;
}

export const WidgetEditModal: ManagedModal<ModalProps<WidgetKind>> = ({
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
          {Object.entries(innerProps.definition).map(
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
