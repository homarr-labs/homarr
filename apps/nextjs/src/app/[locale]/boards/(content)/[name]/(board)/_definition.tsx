import { getBoardByNameAsync } from "@homarr/api/board-server";

import { createBoardContentPage } from "../../_creator";

export default createBoardContentPage<{ locale: string; name: string }>({
  async getInitialBoardAsync({ name }) {
    return await getBoardByNameAsync(name);
  },
});
