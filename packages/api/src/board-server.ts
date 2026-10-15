import { cache } from "react";

import type { Session } from "@homarr/auth";
import type { DeviceType } from "@homarr/common/server";
import { db } from "@homarr/db";

import { createRscTrpcContext } from "./rsc-context";
import { boardRouter } from "./router/board";

const createBoardCallerAsync = async () => boardRouter.createCaller(await createRscTrpcContext());

// Background preparation uses the same authorized reads without request cookies.
// Callers supply a currently resolved session; this never grants extra access.
export const getBoardForSessionAsync = async ({
  session,
  deviceType,
  name,
}: {
  session: Session | null;
  deviceType: DeviceType;
  name?: string;
}) => {
  const caller = boardRouter.createCaller({ db, session, deviceType });
  if (name !== undefined) return await caller.getBoardByName({ name });
  return await caller.getHomeBoard();
};

export const getBoardByNameAsync = cache(async (name: string) => {
  const caller = await createBoardCallerAsync();
  return await caller.getBoardByName({ name });
});

export const getHomeBoardAsync = cache(async () => {
  const caller = await createBoardCallerAsync();
  return await caller.getHomeBoard();
});
