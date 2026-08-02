import { cache } from "react";

import { createRscTrpcContext } from "./rsc-context";
import { boardRouter } from "./router/board";

const createBoardCallerAsync = async () => boardRouter.createCaller(await createRscTrpcContext());

export const getBoardByNameAsync = cache(async (name: string) => {
  const caller = await createBoardCallerAsync();
  return await caller.getBoardByName({ name });
});

export const getHomeBoardAsync = cache(async () => {
  const caller = await createBoardCallerAsync();
  return await caller.getHomeBoard();
});
