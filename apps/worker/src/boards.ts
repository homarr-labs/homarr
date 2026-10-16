import superjson from "superjson";

import { db, eq, inArray } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import type { AccessPrincipal } from "@homarr/worker-access";

import type { WorkerState } from "./state";
import { getBoardWidgetData, safeWidgetLink } from "./widget-data";
import { initializeWorkerServices } from "./services";

export async function listBoards(state: WorkerState, principal: AccessPrincipal) {
  state.access.assertActive(principal);
  if (principal.role !== "owner" && !principal.boardIds.length) return { boards: [] };
  const rows = await db.query.boards.findMany({
    columns: { id: true, name: true },
    where: principal.role === "owner" ? undefined : inArray(boards.id, [...principal.boardIds]),
  });
  return { boards: rows };
}

/** Publisher-selected board data only; never return sources, credentials, integration configuration or raw widget options. */
export async function readBoard(state: WorkerState, principal: AccessPrincipal, id: string, signal?: AbortSignal) {
  state.access.authorizeProcedure(principal, { path: "remote.board", kind: "query", boardId: id });
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, id),
    columns: { id: true, name: true },
    with: { items: { with: { integrations: true } } },
  });
  if (!board) return null;
  const apps: { id: string; name: string; url: string }[] = [];
  const widgets: { id: string; kind: string; title: string; data: unknown }[] = [];
  let caller: Promise<import("@homarr/api/orpc").ORPCClient> | undefined;
  const getCaller = () => {
    caller ??= (async () => {
      await initializeWorkerServices();
      const [{ createCaller, createApiContext }, { getReadSession }] = await Promise.all([
        import("@homarr/api"),
        import("./api"),
      ]);
      return createCaller(
        createApiContext({
          session: await getReadSession(state, principal),
          headers: new Headers({ host: new URL(state.publicUrl).host }),
        }),
      );
    })();
    return caller;
  };
  const appRows = await db.query.apps.findMany({ columns: { id: true, name: true, href: true } });
  for (const item of board.items) {
    signal?.throwIfAborted();
    let options: Record<string, unknown> = {};
    try {
      options = superjson.parse<Record<string, unknown>>(item.options);
    } catch {
      /* Malformed legacy options are not display data. */
    }
    if (item.kind === "app" && typeof options.appId === "string") {
      const app = appRows.find((candidate) => candidate.id === options.appId);
      if (app) {
        const url = safeWidgetLink(app.href);
        if (url) apps.push({ id: app.id, name: app.name, url });
      }
      continue;
    }
    const ids = item.integrations.map((entry) => entry.integrationId);
    const data = await getBoardWidgetData(
      { kind: item.kind, options, integrationIds: ids, itemId: item.id, boardId: board.id },
      {
        caller: getCaller,
        signal,
        mediaPath: async (path) => {
          const { createBoardMediaPath } = await import("./media");
          return createBoardMediaPath(state, principal, board.id, path);
        },
      },
    );
    widgets.push({
      id: item.id,
      kind: item.kind,
      title: typeof options.title === "string" ? options.title.slice(0, 200) : item.kind,
      data: data.status === "ready" ? data.data : data,
    });
  }
  state.access.assertActive(principal);
  return { id: board.id, name: board.name, apps, widgets };
}
