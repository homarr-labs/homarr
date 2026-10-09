import { notFound } from "next/navigation";

import { BoardDebugPreview } from "~/components/board/debug/preview";
import { env } from "~/env";

export const dynamic = "force-dynamic";

export default function BoardDebugPreviewPage() {
  if (!env.ENABLE_BOARD_DEBUG) notFound();
  return <BoardDebugPreview />;
}
