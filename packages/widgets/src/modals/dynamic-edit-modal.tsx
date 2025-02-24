"use client";

import { Button, ColorInput, Group, Stack, useMantineTheme } from "@mantine/core";
import { z } from "zod";

import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

export const dynamicSectionOptionsSchema = z.object({
  borderColor: z.string().nullable().default(null),
});

export interface DynamicEditModalState {
  options: object;
}

interface ModalProps {
  value: z.infer<typeof dynamicSectionOptionsSchema>;
  onSuccessfulEdit: (value: z.infer<typeof dynamicSectionOptionsSchema>) => void;
}

export const DynamicSectionEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const theme = useMantineTheme();

  const form = useZodForm(z.object({ options: dynamicSectionOptionsSchema }), {
    mode: "controlled",
    initialValues: innerProps.value,
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  console.log(innerProps.value);

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
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.edit.title");
  },
  size: "lg",
});
