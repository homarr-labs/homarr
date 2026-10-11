import { notFound } from "next/navigation";

import { BoardDebugPlayground } from "~/components/board/debug/playground";
import { env } from "~/env";

export default function BoardDebugPage() {
  if (!env.ENABLE_BOARD_DEBUG) notFound();
  return <BoardDebugPlayground />;
}
