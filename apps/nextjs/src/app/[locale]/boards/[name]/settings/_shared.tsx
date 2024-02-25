import { clientApi } from "@homarr/api/client";

import type { Board } from "../../_types";

export const useSavePartialSettingsMutation = (board: Board) => {
  const utils = clientApi.useUtils();
  return clientApi.board.savePartialSettings.useMutation({
    onSettled() {
      void utils.board.byName.invalidate({ name: board.name });
      void utils.board.default.invalidate();
    },
  });
};
