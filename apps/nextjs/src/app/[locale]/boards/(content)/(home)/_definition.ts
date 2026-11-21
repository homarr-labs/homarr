import { getHomeBoardAsync } from "@homarr/api/board-server";

import { createBoardContentPage } from "../_creator";
import HomeBoardNotFoundPage from "../not-found";

export default createBoardContentPage<{ locale: string }>({
  // Keep home-board recovery reachable through proxies that intercept HTTP errors.
  notFoundComponent: HomeBoardNotFoundPage,
  async getInitialBoardAsync() {
    return await getHomeBoardAsync();
  },
});
