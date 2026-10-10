import { notFound } from "next/navigation";

import { BoardDebugPreview } from "~/components/board/debug/preview";
import { env } from "~/env";

export default function BoardDebugPage() {
  if (!env.ENABLE_BOARD_DEBUG) notFound();
  return <BoardDebugPreview />;
}
