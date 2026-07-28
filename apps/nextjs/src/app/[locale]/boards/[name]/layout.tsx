import { getBoardByNameAsync } from "@homarr/api/board-server";

import { BoardOtherHeaderActions } from "../_header-actions";
import { createBoardLayout } from "../_layout-creator";

export default createBoardLayout<{ locale: string; name: string }>({
  headerActions: <BoardOtherHeaderActions />,
  async getInitialBoardAsync({ name }) {
    return await getBoardByNameAsync(name);
  },
});
