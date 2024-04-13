import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../_creator";

export default createBoardContentPage<{ locale: string; name: string }>({
  async getInitialBoard({ name }) {
    return await api.board.byName({ name });
  },
});
