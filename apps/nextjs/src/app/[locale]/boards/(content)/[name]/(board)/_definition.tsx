import { cache } from "react";

import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../../_creator";

const getBoardByNameCachedAsync = cache(async (name: string) => await api.board.getBoardByName({ name }));

export default createBoardContentPage<{ locale: string; name: string }>({
  async getInitialBoardAsync({ name }) {
    return await getBoardByNameCachedAsync(name);
  },
});
