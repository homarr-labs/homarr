"use client";

import { Button, Group, NumberInput, Stack } from "@mantine/core";

import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import type { BoardItemAdvancedOptions } from "@homarr/validation";

interface InnerProps {
  advancedOptions: BoardItemAdvancedOptions;
  onSuccess: (options: BoardItemAdvancedOptions) => void;
}

export const WidgetAdvancedOptionsModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useForm({
    initialValues: innerProps.advancedOptions,
  });
  const handleSubmit = (values: BoardItemAdvancedOptions) => {
    innerProps.onSuccess(values);
    actions.closeModal();
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextMultiSelect
          label={t("item.edit.field.customCssClasses.label")}
          {...form.getInputProps("customCssClasses")}
        />
        <NumberInput
          label={t("item.edit.field.customTextSize.label")}
          min={0}
          max={10}
          step={0.1}
          defaultValue={1}
          {...form.getInputProps("customTextSize")}
        />
        <NumberInput
          label={t("item.edit.field.customSpacing.label")}
          description={t("item.edit.field.customSpacing.description")}
          min={0}
          max={10}
          step={0.1}
          defaultValue={1}
          {...form.getInputProps("customSpacing")}
        />
        <Group justify="end">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" color="teal">
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.edit.advancedOptions.title");
  },
  size: "lg",
  transitionProps: {
    duration: 0,
  },
});
