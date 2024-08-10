"use client";

import { Button, Group, Select, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";

interface ChangeHomeBoardFormProps {
  user: RouterOutputs["user"]["getById"];
  boardsData: { value: string; label: string }[];
}

export const ChangeHomeBoardForm = ({ user, boardsData }: ChangeHomeBoardFormProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changeHomeBoardId.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess(_, variables) {
      form.setInitialValues({
        homeBoardId: variables.homeBoardId,
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
  const form = useZodForm(validation.user.changeHomeBoard, {
    initialValues: {
      homeBoardId: user.homeBoardId ?? "",
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
        <Select w="100%" data={boardsData} {...form.getInputProps("homeBoardId")} />

        <Group justify="end">
          <Button type="submit" color="teal" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof validation.user.changeHomeBoard>;
