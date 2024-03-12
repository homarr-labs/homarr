import type { ManagedModal } from "mantine-modal-manager";
import { boardSchemas } from "node_modules/@homarr/validation/src/board";

import { useForm, zodResolver } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, Stack, TextInput } from "@homarr/ui";
import { z } from "@homarr/validation";

interface InnerProps {
  boardNames: string[];
  onSuccess: ({ name }: { name: string }) => Promise<void>;
}

export const AddBoardModal: ManagedModal<InnerProps> = ({
  actions,
  innerProps,
}) => {
  const t = useI18n();
  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: zodResolver(
      z.object({
        name: boardSchemas.byName.shape.name.refine(
          (value) => !innerProps.boardNames.includes(value),
        ),
      }),
    ),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void innerProps.onSuccess(values);
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput
          label={t("management.page.board.modal.createBoard.field.name.label")}
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Group justify="right">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button disabled={!form.isValid()} type="submit" color="teal">
            {t("common.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
