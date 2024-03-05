import { api } from "@homarr/api/server";

import { createBoardPage } from "../_creator";

export default createBoardPage<{ locale: string }>({
  async getInitialBoard() {
    return await api.board.default();
  },
});
