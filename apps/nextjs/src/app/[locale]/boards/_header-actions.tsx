"use client";

import { IconLayoutBoard } from "@tabler/icons-react";

import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "./(content)/_context";

export const BoardOtherHeaderActions = () => {
  const board = useRequiredBoard();

  return (
    <HeaderButton href={`/boards/${board.name}`}>
      <IconLayoutBoard stroke={1.5} />
    </HeaderButton>
  );
};
