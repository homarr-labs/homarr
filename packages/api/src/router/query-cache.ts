import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import { removeQueryCacheAsync, setQueryCacheAsync } from "@homarr/redis";

import { queryCacheDefaultGcTimeMs, queryCacheMaxValueBytes } from "../query-cache";
import { createTRPCRouter, internalProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";

const queryCacheBoardInput = z.object({
  boardId: z.string().min(1),
});

const queryCacheSetInput = queryCacheBoardInput.extend({
  value: z.string().max(queryCacheMaxValueBytes * 2),
});

const validateBoardAccessAsync = async (ctx: Parameters<typeof throwIfActionForbiddenAsync>[0], boardId: string) => {
  await throwIfActionForbiddenAsync(ctx, eq(boards.id, boardId), "view");
};

export const queryCacheRouter = createTRPCRouter({
  setItem: internalProcedure.input(queryCacheSetInput).mutation(async ({ ctx, input }) => {
    await validateBoardAccessAsync(ctx, input.boardId);
    const userId = ctx.session?.user.id ?? "anonymous";
    return {
      stored: await setQueryCacheAsync(
        userId,
        input.boardId,
        input.value,
        queryCacheDefaultGcTimeMs,
        queryCacheMaxValueBytes,
      ),
    };
  }),
  removeItem: internalProcedure.input(queryCacheBoardInput).mutation(async ({ ctx, input }) => {
    await validateBoardAccessAsync(ctx, input.boardId);
    const userId = ctx.session?.user.id ?? "anonymous";
    await removeQueryCacheAsync(userId, input.boardId);
  }),
});
