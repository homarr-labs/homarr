import { notFound } from "next/navigation";

import { BoardSanityWorkbench } from "~/components/board/debug/sanity/workbench";
import { env } from "~/env";

export const metadata = {
  title: "Board sanity workbench",
  robots: { index: false, follow: false },
};

export default function BoardSanityPage() {
  if (!env.ENABLE_BOARD_DEBUG) notFound();
  return <BoardSanityWorkbench />;
}
