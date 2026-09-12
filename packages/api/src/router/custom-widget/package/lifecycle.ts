import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";

import { publicProcedure } from "../../../trpc";
import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { BoundedAsyncQueue } from "../../widgets/bounded-async-queue";
import { observeWidgetPackageChanges } from "./events";
import { parsePackagePlacement } from "./records";
import { refreshWidgetActor } from "./actor";

export const packageLifecycleProcedures = {
  packageLifecycle: publicProcedure.input(z.object({ itemId: z.string() })).subscription(async function* ({
    ctx,
    input,
    signal,
  }) {
    ctx = { ...ctx, ...(await refreshWidgetActor(ctx)) };
    const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
    if (!item || item.kind !== "customApi") throw new TRPCError({ code: "NOT_FOUND" });
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
    const options = parsePackagePlacement(item.options);
    if (!options) throw new TRPCError({ code: "NOT_FOUND" });
    const queue = new BoundedAsyncQueue<{ kind: string }>(1);
    const unsubscribe = observeWidgetPackageChanges((change) => {
      if (change.installationId === options.definitionId || change.itemIds.includes(item.id))
        queue.push({ kind: change.kind });
    });
    const abort = () => queue.close();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    // Board permission changes are independent of package updates; a periodic authorization check
    // closes a previously authorized stream without polling upstream widget data.
    const check = setInterval(() => {
      void refreshWidgetActor(ctx)
        .then((actor) => throwIfActionForbiddenAsync(actor, eq(boards.id, item.boardId), "view"))
        .catch((error: unknown) => queue.fail(error));
    }, 30_000);
    check.unref();
    try {
      yield* queue;
    } finally {
      unsubscribe();
      clearInterval(check);
      signal?.removeEventListener("abort", abort);
      queue.close();
    }
  }),
};
