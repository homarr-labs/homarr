"use client";

import { useRequiredBoard } from "@homarr/boards/context";
import { IconLayoutBoard } from "@tabler/icons-react";

import { HeaderButton } from "~/components/layout/header/button";

export const BoardOtherHeaderActions = () => {
  const board = useRequiredBoard();

  return (
    <HeaderButton href={`/boards/${board.name}`}>
      <IconLayoutBoard stroke={1.5} />
    </HeaderButton>
  );
};
