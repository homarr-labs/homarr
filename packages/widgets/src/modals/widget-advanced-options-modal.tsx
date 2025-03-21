"use client";

import { Button, CloseButton, ColorInput, Group, Stack, useMantineTheme } from "@mantine/core";

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
  const theme = useMantineTheme();
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
        <ColorInput
          label={t("item.edit.field.borderColor.label")}
          format="hex"
          swatches={Object.values(theme.colors).map((color) => color[6])}
          rightSection={
            <CloseButton
              onClick={() => form.setFieldValue("borderColor", "")}
              style={{ display: form.getInputProps("borderColor").value ? undefined : "none" }}
            />
          }
          {...form.getInputProps("borderColor")}
        />
        <Group justify="end">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button type="submit">
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
