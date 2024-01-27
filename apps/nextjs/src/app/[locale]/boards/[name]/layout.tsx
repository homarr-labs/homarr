import type { PropsWithChildren } from "react";

import { api } from "~/trpc/server";
import { BoardLayout } from "../_layout";

export default async function DefaultBoardLayout({
  children,
}: PropsWithChildren) {
  // TODO: change to byName
  const initialBoard = await api.board.default.query();

  return <BoardLayout initialBoard={initialBoard}>{children}</BoardLayout>;
}
