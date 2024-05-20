import { Button, Group, Stack, TextInput } from "@mantine/core";
import { boardSchemas } from "node_modules/@homarr/validation/src/board";

import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { z } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

interface InnerProps {
  boardNames: string[];
  onSuccess: ({ name }: { name: string }) => Promise<void>;
}

export const AddBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useZodForm(
    z.object({
      name: boardSchemas.byName.shape.name.refine((value) => !innerProps.boardNames.includes(value), {
        params: createCustomErrorParams("boardAlreadyExists"),
      }),
    }),
    {
      initialValues: {
        name: "",
      },
    },
  );

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void innerProps.onSuccess(values);
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput label={t("board.field.name.label")} data-autofocus {...form.getInputProps("name")} />
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
}).withOptions({
  defaultTitle: (t) => t("management.page.board.action.new.label"),
});
