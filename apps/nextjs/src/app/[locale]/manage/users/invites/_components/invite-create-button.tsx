"use client";

import { Button } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { MANAGE_ACTION_BUTTON_MIN_WIDTH } from "~/components/manage/manage-page.constants";

export const InviteCreateButton = ({ onClick }: { onClick: () => void }) => {
  const t = useI18n("management.page.user.invite");

  return (
    <Button miw={MANAGE_ACTION_BUTTON_MIN_WIDTH} onClick={onClick}>
      {t("action.new.title")}
    </Button>
  );
};
