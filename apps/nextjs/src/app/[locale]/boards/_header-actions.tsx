"use client";

import { IconLayoutBoard } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import { HeaderButton } from "~/components/layout/header/button";

export const BoardOtherHeaderActions = () => {
  const board = useRequiredBoard();
  const translateBoardContent = useI18n("board.content");

  return (
    <HeaderButton
      href={`/boards/${board.name}`}
      aria-label={translateBoardContent("metaTitle", { boardName: board.name })}
    >
      <IconLayoutBoard stroke={1.5} />
    </HeaderButton>
  );
};
