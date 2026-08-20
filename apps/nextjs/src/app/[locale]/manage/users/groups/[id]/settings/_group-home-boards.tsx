"use client";

import { Button, Group, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { groupSettingsSchema } from "@homarr/validation/group";

import { BoardSelect } from "~/components/board/board-select";

interface GroupHomeBoardsProps {
  homeBoardId: string | null;
  mobileHomeBoardId: string | null;
  groupId: string;
}

export const GroupHomeBoards = ({ homeBoardId, mobileHomeBoardId, groupId }: GroupHomeBoardsProps) => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  const [availableBoards] = clientApi.board.getBoardsForGroup.useSuspenseQuery({ groupId });
  const form = useZodForm(groupSettingsSchema.pick({ homeBoardId: true, mobileHomeBoardId: true }), {
    initialValues: {
      homeBoardId,
      mobileHomeBoardId,
    },
  });
  const { mutateAsync, isPending } = clientApi.group.savePartialSettings.useMutation();

  const handleSubmit = form.onSubmit(async (values) => {
    await mutateAsync(
      {
        id: groupId,
        settings: values,
      },
      {
        onSuccess() {
          form.setInitialValues(values);
          showSuccessNotification({
            title: tGroup("action.settings.board.notification.success.title"),
            message: tGroup("action.settings.board.notification.success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: tGroup("action.settings.board.notification.error.title"),
            message: tGroup("action.settings.board.notification.error.message"),
          });
        },
      },
    );
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <BoardSelect
          label={tGroup("field.homeBoard.label")}
          description={tGroup("field.homeBoard.description")}
          clearable
          boards={availableBoards}
          {...form.getInputProps("homeBoardId")}
        />

        <BoardSelect
          label={tGroup("field.mobileBoard.label")}
          description={tGroup("field.mobileBoard.description")}
          clearable
          boards={availableBoards}
          {...form.getInputProps("mobileHomeBoardId")}
        />

        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {tCommon("action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
