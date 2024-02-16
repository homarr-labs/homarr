"use client";

import { IconLayoutBoard } from "@homarr/ui";

import { HeaderButton } from "~/components/layout/header/button";
import { useRequiredBoard } from "../../../_context";

export default function BoardViewLayout() {
  const board = useRequiredBoard();

  return (
    <HeaderButton href={`/boards/${board.name}`}>
      <IconLayoutBoard stroke={1.5} />
    </HeaderButton>
  );
}
