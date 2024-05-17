"use client";

import { Button, Group, Stack } from "@mantine/core";

import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { TextMultiSelect } from "@homarr/ui";
import type { BoardItemAdvancedOptions } from "@homarr/validation";

interface InnerProps {
  advancedOptions: BoardItemAdvancedOptions;
  onSuccess: (options: BoardItemAdvancedOptions) => void;
}

export const WidgetAdvancedOptionsModal = createModal<InnerProps>(
  ({ actions, innerProps }) => {
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
            label="Custom css classes"
            {...form.getInputProps("customCssClasses")}
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
  },
).withOptions({
  defaultTitle: "Advanced item options",
  size: "lg",
  transitionProps: {
    duration: 0,
  },
});
