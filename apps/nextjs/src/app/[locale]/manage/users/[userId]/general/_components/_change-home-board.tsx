"use client";

import { Button, Group, Select, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

interface ChangeHomeBoardFormProps {
  user: RouterOutputs["user"]["getById"];
  boardsData: { value: string; label: string }[];
}

export const ChangeHomeBoardForm = ({ user, boardsData }: ChangeHomeBoardFormProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changeHomeBoards.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess(_, variables) {
      form.setInitialValues({
        homeBoardId: variables.homeBoardId,
        mobileHomeBoardId: variables.mobileHomeBoardId,
      });
      showSuccessNotification({
        message: t("user.action.changeHomeBoard.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: t("user.action.changeHomeBoard.notification.error.message"),
      });
    },
  });
  const form = useZodForm(validation.user.changeHomeBoards, {
    initialValues: {
      homeBoardId: user.homeBoardId ?? "",
      mobileHomeBoardId: user.mobileHomeBoardId ?? "",
    },
  });

  const handleSubmit = (values: FormType) => {
    mutate({
      userId: user.id,
      ...values,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Select
          label={t("management.page.user.setting.general.item.board.type.general")}
          w="100%"
          data={boardsData}
          {...form.getInputProps("homeBoardId")}
        />
        <Select
          label={t("management.page.user.setting.general.item.board.type.mobile")}
          w="100%"
          data={boardsData}
          {...form.getInputProps("mobileHomeBoardId")}
        />

        <Group justify="end">
          <Button type="submit" color="teal" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof validation.user.changeHomeBoards>;
