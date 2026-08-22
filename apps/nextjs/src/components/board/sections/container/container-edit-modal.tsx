"use client";

import { CloseButton, ColorInput, Stack, Switch, TextInput, useMantineTheme } from "@mantine/core";
import type { z } from "zod/v4";

import { useZodForm } from "@homarr/form";
import { createModal, ModalFormFooter, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

interface ModalProps {
  value: z.infer<typeof containerSectionOptionsSchema>;
  onSuccessfulEdit: (value: z.infer<typeof containerSectionOptionsSchema>) => void;
}

export const ContainerEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const tSection = useI18n("section");
  const theme = useMantineTheme();
  const form = useZodForm(containerSectionOptionsSchema.unwrap(), {
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
        <TextInput label={tSection("container.option.title.label")} data-autofocus {...form.getInputProps("title")} />
        <Switch
          label={tSection("option.showLabel.label")}
          description={tSection("option.showLabel.description")}
          {...form.getInputProps("showLabel", { type: "checkbox" })}
        />
        <Switch
          label={tSection("option.collapsible.label")}
          description={tSection("option.collapsible.description")}
          {...form.getInputProps("collapsible", { type: "checkbox" })}
        />
        <Switch
          label={tSection("option.showOpenAll.label")}
          description={tSection("option.showOpenAll.description")}
          {...form.getInputProps("showOpenAll", { type: "checkbox" })}
        />
        <Switch
          label={tSection("option.scrollable.label")}
          description={tSection("option.scrollable.description")}
          {...form.getInputProps("scrollable", { type: "checkbox" })}
        />
        <TextMultiSelect
          label={tSection("container.option.customCssClasses.label")}
          {...form.getInputProps("customCssClasses")}
        />
        <ColorInput
          label={tSection("container.option.borderColor.label")}
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
