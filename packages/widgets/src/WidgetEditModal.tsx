"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ManagedModal } from "mantine-modal-manager";

import { Button, Group, Stack } from "@homarr/ui";

import type { WidgetSort } from ".";
import { getInputForType } from "./_inputs";
import { FormProvider, useForm } from "./_inputs/form";
import type { WidgetOptionsRecordOf } from "./definition";
import type {
  inferOptionsFromDefinition,
  WidgetOptionDefinition,
} from "./options";

interface ModalProps<TSort extends WidgetSort> {
  sort: TSort;
  state: [
    inferOptionsFromDefinition<WidgetOptionsRecordOf<TSort>>,
    Dispatch<
      SetStateAction<inferOptionsFromDefinition<WidgetOptionsRecordOf<TSort>>>
    >,
  ];
  definition: WidgetOptionsRecordOf<TSort>;
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
        setValue(v as never);
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
                  sort={innerProps.sort}
                  property={key as never}
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
