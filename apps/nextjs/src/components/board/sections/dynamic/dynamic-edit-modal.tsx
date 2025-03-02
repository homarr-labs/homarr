"use client";

import { Button, CloseButton, ColorInput, Group, Stack, useMantineTheme } from "@mantine/core";
import type { z } from "zod";

import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { dynamicSectionOptionsSchema } from "@homarr/validation";

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
        <ColorInput
          label={t("section.dynamic.option.borderColor.label")}
          format="hex"
          swatches={Object.values(theme.colors).map((color) => color[6])}
          rightSection={
            <CloseButton
              aria-label="Clear input"
              onClick={() => form.setFieldValue("borderColor", "")}
              style={{ display: form.getInputProps("borderColor").value ? undefined : "none" }}
            />
          }
          {...form.getInputProps("borderColor")}
        />
        <Group justify="end">
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
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: "lg",
});
