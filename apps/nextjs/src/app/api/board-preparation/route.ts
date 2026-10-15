import { revalidatePath } from "next/cache";
import { isPreparationRequest, preparedBoardPath } from "@homarr/cron-jobs/board-preparation";

import { prepareRegisteredBoardsAsync } from "~/board-preparation/prepare";
import { readBoardPreparationRegistryAsync } from "~/board-preparation/store";

export const POST = async (request: Request) => {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isPreparationRequest(request)) return new Response(null, { status: 404, headers });
  const search = new URL(request.url).searchParams;
  const invalidation = search.get("invalidate");
  if (invalidation) {
    const slot = search.get("slot");
    if (!/^[a-f0-9]{64}$/.test(invalidation) || (slot !== "0" && slot !== "1"))
      return new Response(null, { status: 400, headers });
    const variant = (await readBoardPreparationRegistryAsync())[invalidation];
    if (!variant) return new Response(null, { status: 404, headers });
    revalidatePath(`${preparedBoardPath}/${variant.spec.locale}/${invalidation}/${slot}`);
    return new Response(null, { status: 204, headers });
  }
  const id = search.get("view") ?? undefined;
  if (id !== undefined && !/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 400, headers });
  const boardId = search.get("board") ?? undefined;
  if (boardId !== undefined && (boardId.length === 0 || boardId.length > 128))
    return new Response(null, { status: 400, headers });
  await prepareRegisteredBoardsAsync(id, boardId, request.signal);
  return new Response(null, { status: 204, headers });
};
