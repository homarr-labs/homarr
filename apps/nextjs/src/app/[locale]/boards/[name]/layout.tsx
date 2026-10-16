import { Suspense } from "react";
import { getBoardByNameAsync } from "@homarr/api/board-server";

import { CommonLoading } from "~/components/layout/loading";

import { BoardOtherHeaderActions } from "../_header-actions";
import { createBoardLayout } from "../_layout-creator";

const BoardSettingsLayout = createBoardLayout<{ locale: string; name: string }>({
  headerActions: <BoardOtherHeaderActions />,
  withCustomCss: false,
  async getInitialBoardAsync({ name }) {
    return await getBoardByNameAsync(name);
  },
});

export default function Layout(props: Parameters<typeof BoardSettingsLayout>[0]) {
  return (
    <Suspense fallback={<CommonLoading />}>
      <BoardSettingsLayout {...props} />
    </Suspense>
  );
}
