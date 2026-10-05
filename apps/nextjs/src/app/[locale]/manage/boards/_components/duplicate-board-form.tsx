"use client";

import { useRouter } from "next/navigation";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { BoardNameAvailability, useBoardNameStatus } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { boardDuplicateSchema } from "@homarr/validation/board";

interface DuplicateBoardFormProps {
  board: {
    id: string;
    name: string;
  };
  onCancel: () => void;
}

export const DuplicateBoardForm = ({ board, onCancel }: DuplicateBoardFormProps) => {
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const router = useRouter();
  const form = useZodForm(boardDuplicateSchema.omit({ id: true }), {
    mode: "controlled",
    initialValues: {
      name: board.name,
    },
  });
  const boardNameStatus = useBoardNameStatus(form.values.name);
  const { mutateAsync, isPending } = clientApi.board.duplicateBoard.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        if (!boardNameStatus.canSubmit) return;

        await mutateAsync(
          {
            ...values,
            id: board.id,
          },
          {
            onSuccess() {
              showSuccessNotification({
                title: tBoard("action.duplicate.notification.success.title"),
                message: tBoard("action.duplicate.notification.success.message"),
              });
              onCancel();
              router.refresh();
            },
            onError() {
              showErrorNotification({
                title: tBoard("action.duplicate.notification.error.title"),
                message: tBoard("action.duplicate.notification.error.message"),
              });
            },
          },
        );
      })}
    >
      <Stack maw={720}>
        <Text size="sm" c="gray.6">
          {tBoard("action.duplicate.message", { name: board.name })}
        </Text>
        <TextInput
          label={tCommon("field.name")}
          autoFocus
          {...form.getInputProps("name")}
          description={<BoardNameAvailability status={boardNameStatus} />}
          withAsterisk
        />
        <Group justify="end" wrap="wrap">
          <Button variant="default" onClick={onCancel}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={isPending} disabled={!boardNameStatus.canSubmit}>
            {tBoard("action.duplicate.title")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
