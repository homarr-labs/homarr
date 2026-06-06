"use client";

import { CloseButton, ColorInput, Stack, TextInput, useMantineTheme } from "@mantine/core";
import type { z } from "zod/v4";

import { useZodForm } from "@homarr/form";
import { createModal, ModalFormFooter, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import { dynamicSectionOptionsSchema } from "@homarr/validation/shared";

interface ModalProps {
  value: z.infer<typeof dynamicSectionOptionsSchema>;
  onSuccessfulEdit: (value: z.infer<typeof dynamicSectionOptionsSchema>) => void;
}

export const DynamicSectionEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const theme = useMantineTheme();

  const form = useZodForm(dynamicSectionOptionsSchema, {
    mode: "controlled",
    initialValues: { ...innerProps.value },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        innerProps.onSuccessfulEdit(values);
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput label={t("section.dynamic.option.title.label")} data-autofocus {...form.getInputProps("title")} />
        <TextMultiSelect
          label={t("section.dynamic.option.customCssClasses.label")}
          {...form.getInputProps("customCssClasses")}
        />
        <ColorInput
          label={t("section.dynamic.option.borderColor.label")}
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
    return t("item.edit.title");
  },
  size: modalSizeForm,
});
