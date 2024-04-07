import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../_creator";

export default createBoardContentPage<{ locale: string }>({
  async getInitialBoard() {
    return await api.board.default();
  },
});
