import { Anchor, Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import type { BoardProjection, Bootstrap } from "../contracts/schemas";
import { boardIdSchema, boardSnapshotSchema } from "../contracts/schemas";
import type { BoardDataAdapter, RenderAssets } from "../contracts/ui";
import { runSessionTransition } from "../features/session/session-transition";
import { BoardViewer } from "../features/viewer/board-viewer";
import { normalizeJson } from "../features/viewer/serialized-state";
import type { FixtureClient } from "../server/api/client";
import { AppRoot } from "./root";
import { boardSlots } from "./slots";

export interface RouterContext {
  adapter: BoardDataAdapter;
  client: FixtureClient;
  queryClient: QueryClient;
  assets: RenderAssets;
  bootstrap?: Bootstrap;
}

interface BoardReconciliation {
  epoch: number;
  snapshots: WeakMap<object, number>;
}

const reconciliations = new WeakMap<QueryClient, BoardReconciliation>();

function reconciliationFor(queryClient: QueryClient): BoardReconciliation {
  let reconciliation = reconciliations.get(queryClient);
  if (!reconciliation) {
    reconciliation = { epoch: 0, snapshots: new WeakMap() };
    reconciliations.set(queryClient, reconciliation);
  }
  return reconciliation;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: AppRoot });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <main>Nitro fixture foundation. Board rendering is not implemented.</main>,
});
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boards/$boardId",
  loader: async ({ context, params, abortController }) => {
    const reconciliation = reconciliationFor(context.queryClient);
    const epoch = reconciliation.epoch;
    try {
      const boardId = boardIdSchema.parse(params.boardId);
      const snapshot = boardSnapshotSchema.parse(await context.adapter.readSnapshot(boardId));
      if (abortController.signal.aborted || reconciliation.epoch !== epoch || snapshot.board.id !== boardId) {
        throw new Error("Board access could not be confirmed");
      }
      reconciliation.snapshots.set(snapshot, epoch);
      return snapshot;
    } catch {
      throw new Error("Board access could not be confirmed");
    }
  },
  component: BoardRoute,
  errorComponent: BoardRouteError,
  notFoundComponent: BoardRouteNotFound,
});

async function reconcileBoard(router: AppRouter, committedBoard?: BoardProjection): Promise<void> {
  const before = router.state.matches.find((match) => match.routeId === "/boards/$boardId");
  const target = boardIdSchema.safeParse(before?.params.boardId);
  const href = router.state.location.href;
  const reconciliation = reconciliationFor(router.options.context.queryClient);
  const epoch = ++reconciliation.epoch;
  if (!before || !target.success || (committedBoard && committedBoard.id !== target.data)) {
    throw new Error("Board access could not be confirmed");
  }
  try {
    await router.invalidate({ sync: true });
    const state = router.state;
    const match = state.matches.find((candidate) => candidate.routeId === "/boards/$boardId");
    const snapshot = boardSnapshotSchema.safeParse(match?.loaderData);
    if (
      reconciliation.epoch !== epoch ||
      state.location.href !== href ||
      state.isLoading ||
      router.stores.pendingMatchesSnapshot.state.length !== 0 ||
      state.matches.some((candidate) => candidate.status !== "success" || candidate.globalNotFound) ||
      !match ||
      match.id !== before.id ||
      match.status !== "success" ||
      match.isFetching ||
      match.invalid ||
      match.fetchCount <= before.fetchCount ||
      !match.loaderData ||
      reconciliation.snapshots.get(match.loaderData) !== epoch ||
      !snapshot.success ||
      snapshot.data.board.id !== target.data ||
      (committedBoard && snapshot.data.board.revision < committedBoard.revision)
    ) {
      throw new Error("Board access could not be confirmed");
    }
  } catch {
    throw new Error("Board access could not be confirmed");
  }
}

function BoardRoute() {
  const snapshot = boardRoute.useLoaderData();
  const { client, queryClient } = boardRoute.useRouteContext();
  const router = useRouter();
  const onCommitted = useCallback((board: BoardProjection) => reconcileBoard(router, board), [router]);
  const onSessionChanged = useCallback(() => reconcileBoard(router), [router]);
  return (
    <BoardViewer
      snapshot={snapshot}
      client={client}
      queryClient={queryClient}
      onCommitted={onCommitted}
      onSessionChanged={onSessionChanged}
    />
  );
}

function BoardRouteError({ reset }: ErrorComponentProps<unknown>) {
  return <BoardRecovery reset={reset} />;
}

function BoardRouteNotFound() {
  return <BoardRecovery />;
}

function BoardRecovery({ reset }: { reset?: () => void }) {
  const router = useRouter();
  const { client, queryClient } = router.options.context;
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const onSessionChanged = useCallback(async () => {
    await reconcileBoard(router);
    if (typeof reset === "function") reset();
  }, [router, reset]);
  const retry = async () => {
    setRetrying(true);
    setRetryFailed(false);
    try {
      await runSessionTransition(queryClient, async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await onSessionChanged();
      });
    } catch {
      setRetryFailed(true);
    } finally {
      setRetrying(false);
    }
  };
  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="md">
        <Title order={1}>Board access</Title>
        <Text role="alert">Board access could not be confirmed. Board content remains hidden.</Text>
        <boardSlots.Session client={client} queryClient={queryClient} onSessionChanged={onSessionChanged} />
        <Group component="nav" aria-label="Board recovery">
          <Link to="/boards/$boardId" params={{ boardId: "public" }}>
            <Anchor component="span">Public board</Anchor>
          </Link>
          <Button variant="default" loading={retrying} disabled={retrying} onClick={() => void retry()}>
            Retry board access
          </Button>
        </Group>
        {retryFailed && (
          <Text role="alert">
            Access is still unavailable. Refresh access, select a fixture identity, or open the public board.
          </Text>
        )}
      </Stack>
    </Container>
  );
}

const routeTree = rootRoute.addChildren([indexRoute, boardRoute]);

export function createAppRouter(options: Omit<RouterContext, "queryClient"> & { queryClient?: QueryClient }) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5000, refetchOnWindowFocus: false } },
    });
  return createRouter({
    routeTree,
    context: { ...options, queryClient },
    defaultPreload: false,
    defaultStaleTime: 0,
    dehydrate: () => ({ queryState: normalizeJson(dehydrate(queryClient)) }),
    hydrate: (state) => hydrate(queryClient, state.queryState),
    Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
