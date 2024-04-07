import { api } from "@homarr/api/server";

import { BoardOtherHeaderActions } from "../_header-actions";
import { createBoardLayout } from "../_layout-creator";

export default createBoardLayout<{ locale: string; name: string }>({
  headerActions: <BoardOtherHeaderActions />,
  async getInitialBoard({ name }) {
    return await api.board.byName({ name });
  },
});
