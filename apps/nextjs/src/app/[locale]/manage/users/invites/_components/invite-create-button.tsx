"use client";

import { Button } from "@mantine/core";

import { useModalAction } from "@homarr/modals";
import { InviteCreateModal } from "@homarr/modals-collection";
import { useScopedI18n } from "@homarr/translation/client";

import { MANAGE_ACTION_BUTTON_MIN_WIDTH } from "~/components/manage/manage-page.constants";

export const InviteCreateButton = () => {
  const t = useScopedI18n("management.page.user.invite");
  const { openModal } = useModalAction(InviteCreateModal);

  return (
    <Button miw={MANAGE_ACTION_BUTTON_MIN_WIDTH} onClick={() => openModal()}>
      {t("action.new.title")}
    </Button>
  );
};
