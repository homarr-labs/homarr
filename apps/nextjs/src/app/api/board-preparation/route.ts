import { isPreparationRequest } from "@homarr/cron-jobs/board-preparation";

import { prepareRegisteredBoardsAsync } from "~/board-preparation/prepare";

export const POST = async (request: Request) => {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isPreparationRequest(request)) return new Response(null, { status: 404, headers });
  const search = new URL(request.url).searchParams;
  const id = search.get("view") ?? undefined;
  if (id !== undefined && !/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 400, headers });
  const boardId = search.get("board") ?? undefined;
  if (boardId !== undefined && (boardId.length === 0 || boardId.length > 128))
    return new Response(null, { status: 400, headers });
  await prepareRegisteredBoardsAsync(id, boardId, request.signal);
  return new Response(null, { status: 204, headers });
};
