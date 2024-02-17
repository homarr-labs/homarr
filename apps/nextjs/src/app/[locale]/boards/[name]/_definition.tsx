import { api } from "~/trpc/server";
import { createBoardPage } from "../_creator";

export default createBoardPage<{ locale: string; name: string }>({
  async getInitialBoard({ name }) {
    return await api.board.byName({ name });
  },
});
