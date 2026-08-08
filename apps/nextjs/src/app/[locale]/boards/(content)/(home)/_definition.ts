import { getHomeBoardAsync } from "@homarr/api/board-server";

import { createBoardContentPage } from "../_creator";

export default createBoardContentPage<{ locale: string }>({
  async getInitialBoardAsync() {
    return await getHomeBoardAsync();
  },
});
