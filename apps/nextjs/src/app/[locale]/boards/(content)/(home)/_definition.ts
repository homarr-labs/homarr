import { cache } from "react";

import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../_creator";

const getHomeBoardCachedAsync = cache(async () => await api.board.getHomeBoard());

export default createBoardContentPage<{ locale: string }>({
  async getInitialBoardAsync() {
    return await getHomeBoardCachedAsync();
  },
});
