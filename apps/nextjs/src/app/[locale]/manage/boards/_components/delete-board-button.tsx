"use client";

import React from "react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Button } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface Props {
  id: string;
}

export const DeleteBoardButton = ({ id }: Props) => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.board.delete.useMutation({
    onSettled: async () => {
      await revalidatePathAction("/manage/boards");
    },
  });

  const onClick = React.useCallback(async () => {
    await mutateAsync({
      id,
    });
  }, [id, mutateAsync]);

  return (
    <Button onClick={onClick} loading={isPending} color="red">
      {t("management.page.board.action.delete.label")}
    </Button>
  );
};
