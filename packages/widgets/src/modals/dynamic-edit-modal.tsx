"use client";

import { Button, Group, Stack, TextInput } from "@mantine/core";
import { z } from "zod";

import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form";

import { FormProvider, useForm } from "../_inputs/dynamic-form";

export interface DynamicEditModalState {
  options: object;
}

interface ModalProps {
  kind: ["dynamic"];
  value: DynamicEditModalState;
  onSuccessfulEdit: (value: DynamicEditModalState) => void;
}

export const DynamicEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const t = useI18n();

  z.setErrorMap(zodErrorMap(t));
  const form = useForm({
    mode: "controlled",
    initialValues: innerProps.value,
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        innerProps.onSuccessfulEdit(values);
        actions.closeModal();
      })}
    >
      <FormProvider form={form}>
        <Stack>
          <TextInput
            label={t("section.dynamic.option.borderColor.label")}
            placeholder={"#000000"}
            {...form.getInputProps("options.borderColor")}
          />
          <Group justify="space-between">
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
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: "lg",
});
