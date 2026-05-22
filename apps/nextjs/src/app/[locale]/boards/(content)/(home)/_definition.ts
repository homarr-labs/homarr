import { cache } from "react";

import { api } from "@homarr/api/server";

import { createBoardContentPage } from "../_creator";

const getHomeBoardAsync = cache(() => api.board.getHomeBoard());

export default createBoardContentPage<{ locale: string }>({
  getInitialBoardAsync: getHomeBoardAsync,
});
