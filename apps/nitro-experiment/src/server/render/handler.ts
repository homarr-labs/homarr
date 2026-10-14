import { ORPCError } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";
import type { DehydratedRouter } from "@tanstack/react-router/ssr/client";
import { createRequestHandler, renderRouterToString, RouterServer } from "@tanstack/react-router/ssr/server";
import { createElement } from "react";

import { createAppRouter } from "../../app/router";
import type { RequestContext } from "../context/request";
import type { RenderAssets } from "../../contracts/ui";
import type { BoardSnapshot, Bootstrap, RenderArtifact, RenderIdentity } from "../../contracts/schemas";
import {
  boardIdSchema,
  boardSnapshotSchema,
  bootstrapSchema,
  renderAssetsSchema,
  schemaVersion,
} from "../../contracts/schemas";
import { normalizeJson, serializedRouterStateSchema } from "../../features/viewer/serialized-state";
import { createFixtureQueryUtils } from "../api/client";
import { createServerClient } from "../api/root";
import { readAuthorizedBoard } from "../api/board-read";
import { closeArtifactCache, getRenderArtifact, renderEvidence } from "./cache";

async function renderDocument(
  context: RequestContext,
  assets: RenderAssets,
  snapshot: BoardSnapshot,
  identity: RenderIdentity,
): Promise<RenderArtifact> {
  const client = createServerClient(context);
  const router = createAppRouter({
    client,
    assets,
    adapter: {
      async readSnapshot(boardId) {
        if (boardId !== snapshot.board.id) throw new Error("Render adapter board mismatch");
        return snapshot;
      },
    },
  });
  const queryClient = router.options.context.queryClient;
  const queries = createFixtureQueryUtils(client);
  queryClient.setQueryData(queries.board.read.queryKey({ input: { boardId: snapshot.board.id } }), snapshot.board);
  queryClient.setQueryData(queries.widget.read.queryKey({ input: { boardId: snapshot.board.id } }), snapshot.widget);
  let renderedBootstrap: Bootstrap | undefined;
  try {
    const response = await createRequestHandler({ request: context.request, createRouter: () => router })(
      async ({ responseHeaders }) => {
        if (router.stores.statusCode.state !== 200) throw new Error("Fixture loader failed");
        const queryState = normalizeJson(dehydrate(queryClient));
        const matches = router.stores.activeMatchesSnapshot.state;
        const state = {
          manifest: undefined,
          matches: matches.map((match) => ({
            i: match.id.replaceAll("/", "\0"),
            u: match.updatedAt,
            s: match.status,
            b: "__beforeLoadContext" in match ? match.__beforeLoadContext : undefined,
            l: match.loaderData,
            ssr: match.ssr,
          })),
          lastMatchId: matches.at(-1)?.id.replaceAll("/", "\0"),
          dehydratedData: { queryState },
        } satisfies DehydratedRouter;
        const routerState = serializedRouterStateSchema.parse(normalizeJson(state));
        const bootstrap = bootstrapSchema.parse({ identity, snapshot, assets, routerState, queryState });
        renderedBootstrap = bootstrap;
        router.update({ context: { ...router.options.context, bootstrap } });
        return renderRouterToString({
          router,
          responseHeaders,
          children: createElement(RouterServer, { router }),
        });
      },
    );
    if (response.status !== 200 || !renderedBootstrap) throw new Error("Fixture document rendering failed");
    return { html: await response.text(), bootstrap: renderedBootstrap, createdAt: new Date().toISOString() };
  } finally {
    router.serverSsr?.cleanup();
    queryClient.clear();
  }
}

export async function renderPage(context: RequestContext, suppliedAssets: RenderAssets): Promise<Response> {
  const url = new URL(context.request.url);
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (!["GET", "HEAD"].includes(context.request.method))
    return Response.json({ code: "BAD_REQUEST" }, { status: 405, headers });
  if (url.pathname === "/") {
    headers.set("Location", "/boards/public");
    return new Response(null, { status: 302, headers });
  }
  const match = /^\/boards\/([^/]+)\/?$/.exec(url.pathname);
  const id = boardIdSchema.safeParse(match?.[1]);
  if (!id.success) return Response.json({ code: "NOT_FOUND" }, { status: 404, headers });
  const board = await readAuthorizedBoard(context, id.data);
  if (url.search || url.pathname.endsWith("/")) {
    headers.set("Location", `/boards/${id.data}`);
    return new Response(null, { status: 302, headers });
  }
  const client = createServerClient(context);
  const widget = await client.widget.read({ boardId: id.data });
  const snapshot = boardSnapshotSchema.parse({ board, widget });
  const assets = renderAssetsSchema.parse({
    entry: suppliedAssets.entry,
    css: suppliedAssets.css,
    js: suppliedAssets.js,
  });
  const identity: RenderIdentity = {
    boardId: board.id,
    revision: board.revision,
    widgetGeneration: widget.generation,
    buildId: context.config.buildId,
    schemaVersion,
    variant: board.capabilities.variant,
    locale: "en",
    theme: "light",
  };
  const key = JSON.stringify({ identity, snapshot, assets });
  const result = await getRenderArtifact(key, context.config.render, () =>
    renderDocument(context, assets, snapshot, identity),
  );
  if (!result) throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "render-saturated" } });
  const current = await readAuthorizedBoard(context, id.data);
  if (
    current.visibility !== board.visibility ||
    current.capabilities.variant !== identity.variant ||
    current.capabilities.canEdit !== board.capabilities.canEdit
  ) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "render-policy-changed" } });
  }
  const evidence = renderEvidence();
  headers.set("Content-Type", "text/html; charset=UTF-8");
  headers.set("X-Fixture-Render-Cache", result.disposition);
  headers.set("X-Fixture-Render-Count", String(evidence.renders));
  headers.set("X-Fixture-Render-Entries", String(evidence.entries));
  headers.set("X-Fixture-Render-Bytes", String(evidence.bytes));
  headers.set("X-Fixture-Render-In-Flight", String(evidence.inFlight));
  headers.set("X-Fixture-Revision", String(identity.revision));
  headers.set("X-Fixture-Widget-Generation", String(identity.widgetGeneration));
  return new Response(context.request.method === "HEAD" ? null : result.artifact.html, { headers });
}

export function closeRenderState(): Promise<void> {
  return closeArtifactCache();
}
