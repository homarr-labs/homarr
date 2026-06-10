import { cache } from "react";

import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../../_creator";

const getBoardByNameAsync = cache((name: string) => api.board.getBoardByName({ name }));

export default createBoardContentPage<{ locale: string; name: string }>({
  getInitialBoardAsync: async ({ name }) => getBoardByNameAsync(name),
});
