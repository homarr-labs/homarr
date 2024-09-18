"use client";

import { useCallback } from "react";

import { useModalAction } from "@homarr/modals";
import { AddGroupModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

export const AddGroup = () => {
  const t = useI18n();
  const { openModal } = useModalAction(AddGroupModal);

  const handleAddGroup = useCallback(() => {
    openModal();
  }, [openModal]);

  return (
    <MobileAffixButton onClick={handleAddGroup} color="teal">
      {t("group.action.create.label")}
    </MobileAffixButton>
  );
};
