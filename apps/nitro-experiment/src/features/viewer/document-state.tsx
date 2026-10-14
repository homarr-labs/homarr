import { QueryClient, hydrate as hydrateQuery } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { hydrate as hydrateRouter } from "@tanstack/react-router/ssr/client";
import { hydrateRoot } from "react-dom/client";

import { createAppRouter } from "../../app/router";
import { boardSnapshotSchema, bootstrapSchema } from "../../contracts/schemas";
import type { BootstrapScriptProps } from "../../contracts/ui";
import { createBrowserClient } from "../../server/api/client";
import { serializedRouterStateSchema } from "./serialized-state";

export const bootstrapElementId = "nitro-fixture-bootstrap";

export function serializeBootstrap(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export function BootstrapScript({ bootstrap }: BootstrapScriptProps) {
  if (!bootstrap) return null;
  return (
    <script
      id={bootstrapElementId}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: serializeBootstrap(bootstrap) }}
    />
  );
}

let hydration: Promise<void> | undefined;

export function hydrateApplication(): Promise<void> {
  hydration ??= hydrateDocument();
  return hydration;
}

async function hydrateDocument(): Promise<void> {
  const element = document.getElementById(bootstrapElementId);
  if (!element?.textContent) throw new Error("Fixture bootstrap is missing");
  const bootstrap = bootstrapSchema.parse(JSON.parse(element.textContent));
  const routerState = serializedRouterStateSchema.parse(bootstrap.routerState);
  if (
    routerState.matches[0]?.i !== "__root__\0" ||
    routerState.lastMatchId !== routerState.matches.at(-1)?.i ||
    window.location.pathname !== `/boards/${bootstrap.snapshot.board.id}`
  ) {
    throw new Error("Fixture Router state does not match the current board route");
  }
  if (JSON.stringify(routerState.dehydratedData.queryState) !== JSON.stringify(bootstrap.queryState)) {
    throw new Error("Fixture Query snapshots disagree");
  }
  const loaderSnapshot = routerState.matches.at(-1)?.l;
  if (JSON.stringify(loaderSnapshot) !== JSON.stringify(bootstrap.snapshot)) {
    throw new Error("Fixture Router snapshot disagrees with the document");
  }
  if (!window.$_TSR) throw new Error("Router SSR scripts did not initialize");
  window.$_TSR.router = { ...routerState, manifest: undefined };
  const client = createBrowserClient();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5000, refetchOnWindowFocus: false } },
  });
  hydrateQuery(queryClient, routerState.dehydratedData.queryState);
  const router = createAppRouter({
    client,
    queryClient,
    assets: bootstrap.assets,
    bootstrap,
    adapter: {
      async readSnapshot(boardId) {
        const board = await client.board.read({ boardId });
        const widget = await client.widget.read({ boardId });
        return boardSnapshotSchema.parse({ board, widget });
      },
    },
  });
  await hydrateRouter(router);
  hydrateRoot(document, <RouterProvider router={router} />, {
    onRecoverableError(error) {
      console.error("Fixture hydration recovered from a mismatch", error);
      document.documentElement.dataset.fixtureHydration = "mismatch";
    },
  });
}
