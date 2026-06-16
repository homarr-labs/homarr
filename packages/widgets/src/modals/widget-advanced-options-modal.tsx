"use client";

import { CloseButton, ColorInput, Input, Stack, TextInput, useMantineTheme } from "@mantine/core";

import { useForm } from "@homarr/form";
import { createModal, ModalFormFooter, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

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
    innerProps.onSuccess({
      ...values,
      // we want to fallback to null if the title is empty
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      title: values.title?.trim() || null,
    });
    actions.closeModal();
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label={t("item.edit.field.title.label")}
          data-autofocus
          {...form.getInputProps("title")}
          rightSection={<Input.ClearButton onClick={() => form.setFieldValue("title", "")} />}
        />
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
        <ModalFormFooter onCancel={actions.closeModal} />
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.edit.advancedOptions.title");
  },
  size: modalSizeForm,
  transitionProps: {
    duration: 0,
  },
});
