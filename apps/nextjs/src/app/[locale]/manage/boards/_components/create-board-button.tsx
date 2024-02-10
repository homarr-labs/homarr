"use client";

import React from "react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Button } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";

export const CreateBoardButton = () => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.board.create.useMutation({
    onSettled: async () => {
      await revalidatePathAction("/manage/boards");
    },
  });

  const onClick = React.useCallback(async () => {
    await mutateAsync({ name: "default" });
  }, [mutateAsync]);

  return (
    <Button onClick={onClick} loading={isPending}>
      {t("management.page.board.button.create")}
    </Button>
  );
};
