"use client";

import { IconLayoutBoard } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import { HeaderButton } from "~/components/layout/header/button";

export const BoardOtherHeaderActions = () => {
  const board = useRequiredBoard();
  const t = useI18n();

  return (
    <HeaderButton href={`/boards/${board.name}`} aria-label={t("common.userAvatar.menu.homeBoard")}>
      <IconLayoutBoard stroke={1.5} />
    </HeaderButton>
  );
};
