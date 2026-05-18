import { clientApi } from "@homarr/api/client";

import type { Board } from "../../_types";
import { invalidateBoardCacheAsync } from "../../_invalidate-board-cache";

export const useSavePartialSettingsMutation = (board: Board) => {
  const utils = clientApi.useUtils();
  return clientApi.board.savePartialBoardSettings.useMutation({
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
      void invalidateBoardCacheAsync(board.name);
    },
  });
};
