import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import { createQueryCacheChannel } from "@homarr/redis";

import { queryCacheMaxValueBytes, queryCacheRetentionMs } from "../query-cache";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";

const queryCacheKeyInput = z.object({
  boardId: z.string().min(1),
  key: z.string().min(1).max(4096),
});

const queryCacheSetInput = queryCacheKeyInput.extend({
  value: z.string().max(queryCacheMaxValueBytes * 2),
});

const createChannel = (input: z.infer<typeof queryCacheKeyInput>, userId: string) =>
  createQueryCacheChannel({
    userId,
    boardId: input.boardId,
    key: input.key,
    ttlMs: queryCacheRetentionMs,
    maxValueBytes: queryCacheMaxValueBytes,
  });

const validateBoardAccessAsync = async (ctx: Parameters<typeof throwIfActionForbiddenAsync>[0], boardId: string) => {
  await throwIfActionForbiddenAsync(ctx, eq(boards.id, boardId), "view");
};

export const queryCacheRouter = createTRPCRouter({
  getItem: publicProcedure.input(queryCacheKeyInput).query(async ({ ctx, input }) => {
    await validateBoardAccessAsync(ctx, input.boardId);

    const channel = createChannel(input, ctx.session?.user.id ?? "anonymous");
    return await channel.getAsync();
  }),
  setItem: publicProcedure.input(queryCacheSetInput).mutation(async ({ ctx, input }) => {
    await validateBoardAccessAsync(ctx, input.boardId);

    const channel = createChannel(input, ctx.session?.user.id ?? "anonymous");
    return {
      stored: await channel.setAsync(input.value),
    };
  }),
  removeItem: publicProcedure.input(queryCacheKeyInput).mutation(async ({ ctx, input }) => {
    await validateBoardAccessAsync(ctx, input.boardId);

    const channel = createChannel(input, ctx.session?.user.id ?? "anonymous");
    await channel.removeAsync();
  }),
});
