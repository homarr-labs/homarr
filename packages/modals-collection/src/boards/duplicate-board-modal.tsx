import { Button, Group, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { MaybePromise } from "@homarr/common/types";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { createModal } from "../../../modals/src/creator";
import { useBoardNameStatus } from "./add-board-modal";

interface InnerProps {
  board: {
    id: string;
    name: string;
  };
  onSuccess: () => MaybePromise<void>;
}

export const DuplicateBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useZodForm(validation.board.duplicate.omit({ id: true }), {
    mode: "controlled",
    initialValues: {
      name: innerProps.board.name,
    },
  });
  const boardNameStatus = useBoardNameStatus(form.values.name);
  const { mutateAsync, isPending } = clientApi.board.duplicateBoard.useMutation();

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        // Prevent submit before name availability check
        if (!boardNameStatus.canSubmit) return;
        await mutateAsync(
          {
            ...values,
            id: innerProps.board.id,
          },
          {
            async onSuccess() {
              actions.closeModal();
              showSuccessNotification({
                title: t("board.action.duplicate.notification.success.title"),
                message: t("board.action.duplicate.notification.success.message"),
              });
              await innerProps.onSuccess();
            },
            onError() {
              showErrorNotification({
                title: t("board.action.duplicate.notification.error.title"),
                message: t("board.action.duplicate.notification.error.message"),
              });
            },
          },
        );
      })}
    >
      <Stack>
        <Text size="sm" c="gray.6">
          {t("board.action.duplicate.message", { name: innerProps.board.name })}
        </Text>

        <TextInput
          label={t("board.field.name.label")}
          data-autofocus
          {...form.getInputProps("name")}
          description={
            boardNameStatus.description ? (
              <Group c={boardNameStatus.description.color} gap="xs" align="center">
                {boardNameStatus.description.icon ? <boardNameStatus.description.icon size={16} /> : null}
                <span>{boardNameStatus.description.label}</span>
              </Group>
            ) : null
          }
          withAsterisk
        />

        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("common.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("board.action.duplicate.title");
  },
});
