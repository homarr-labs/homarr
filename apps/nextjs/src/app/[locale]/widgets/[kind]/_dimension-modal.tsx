"use client";

import type { ManagedModal } from "mantine-modal-manager";

import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, InputWrapper, Slider, Stack } from "@homarr/ui";

interface InnerProps {
  dimensions: Dimensions;
  setDimensions: (dimensions: Dimensions) => void;
}

export const PreviewDimensionsModal: ManagedModal<InnerProps> = ({
  actions,
  innerProps,
}) => {
  const t = useI18n();
  const form = useForm({
    initialValues: innerProps.dimensions,
  });

  const handleSubmit = (values: Dimensions) => {
    innerProps.setDimensions(values);
    actions.closeModal();
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <InputWrapper label="Width">
          <Slider
            min={64}
            max={1024}
            step={64}
            {...form.getInputProps("width")}
          />
        </InputWrapper>
        <InputWrapper label="Height">
          <Slider
            min={64}
            max={1024}
            step={64}
            {...form.getInputProps("height")}
          />
        </InputWrapper>
        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {t("common.action.cancel")}
          </Button>
          <Button type="submit">{t("common.action.confirm")}</Button>
        </Group>
      </Stack>
    </form>
  );
};

export interface Dimensions {
  width: number;
  height: number;
}
