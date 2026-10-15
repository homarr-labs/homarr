import { setTimeout as delay } from "node:timers/promises";
import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import type { QueryClient as QueryClientType } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { appRouter, createCaller, createTRPCContext } from "@homarr/api";
import type { Session } from "@homarr/auth";
import { createSessionAsync } from "@homarr/auth/server";
import { createId, Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, db, desc, eq, gt } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import { boards, sessions, users } from "@homarr/db/schema";
import {
  createPreparationHeaders,
  getPreparationOrigin,
  preparedBoardPath,
  preparationEndpoint,
} from "@homarr/cron-jobs/board-preparation";
import type { WidgetKind } from "@homarr/definitions";
import { prefetchForKind } from "@homarr/widgets/prefetch";
import { prefetchInitialWidgetData } from "@homarr/widgets/server-prefetch";

import { createBoardQuerySnapshot } from "~/app/[locale]/boards/(content)/_query-snapshot";
import type { Item } from "~/app/[locale]/boards/_types";
import { getBoardPreparationSpec, loadBoardPreparationContextAsync, withPreparedLayout } from "./context";
import {
  createBoardPreparationLockAsync,
  getBoardPreparationFingerprint,
  getBoardPreparationId,
  getPreparationNamespaceAsync,
  preparationMaxAgeMs,
  publishPreparedBoardAsync,
  readBoardPreparationRegistryAsync,
  readPreparedVersionAsync,
  readPreparedBoardAsync,
  rememberBoardPreparationAsync,
  writePreparedBoardAsync,
} from "./store";
import type { BoardPreparationSpec } from "./store";

const logger = createLogger({ module: "boardPreparation" });

const resolveViewerAsync = async (
  spec: Pick<BoardPreparationSpec, "viewerId" | "sessionExpires">,
): Promise<Session | null> => {
  if (spec.viewerId === null) return null;
  if (!spec.sessionExpires || Date.parse(spec.sessionExpires) <= Date.now() + 30_000) {
    throw new Error("Prepared viewer has no current session lifetime");
  }
  const activeSession = await db.query.sessions.findFirst({
    where: and(eq(sessions.userId, spec.viewerId), eq(sessions.expires, new Date(spec.sessionExpires))),
    columns: { userId: true },
  });
  if (!activeSession) throw new Error("Prepared viewer session has ended or changed");
  const user = await db.query.users.findFirst({
    where: eq(users.id, spec.viewerId),
    columns: { id: true, name: true, email: true, image: true, colorScheme: true },
  });
  if (!user) throw new Error("Prepared viewer no longer exists");
  const session = await createSessionAsync(db, user);
  return { ...session, expires: spec.sessionExpires, user: { ...session.user, ...user } };
};

const settleQueriesAsync = async (client: QueryClientType, dependentQueries: Promise<void>[]) => {
  await Promise.allSettled(dependentQueries);
  // Discovery can register another query. Read again after each settled group.
  while (true) {
    const pending = client
      .getQueryCache()
      .getAll()
      .flatMap((query) => {
        if (query.state.fetchStatus !== "fetching" || !query.promise) return [];
        return [query.promise];
      });
    if (pending.length === 0) return;
    await Promise.allSettled(pending);
  }
};

export const prepareBoardAsync = async (id: string, runId?: string) => {
  const log = logger.child({ runId, viewId: id.slice(0, 12) });
  const stopwatch = new Stopwatch();
  log.debug("Starting Board view preparation");
  const lock = await createBoardPreparationLockAsync(id);
  if (!lock) {
    log.debug("Board preparation skipped", { reason: "no_production_build" });
    return;
  }
  const lease = await lock.acquireAsync(180);
  if (!lease) {
    log.debug("Board preparation skipped", { reason: "already_running" });
    return;
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let capacity: Awaited<ReturnType<typeof createBoardPreparationLockAsync>> = null;
  let capacityLease: string | null = null;
  try {
    for (const position of [0, 1]) {
      capacity = await createBoardPreparationLockAsync(`capacity-${position}`);
      capacityLease = (await capacity?.acquireAsync(180)) ?? null;
      if (capacityLease) break;
    }
    if (!capacity || !capacityLease) {
      log.debug("Board preparation skipped", { reason: "render_capacity" });
      return;
    }
    const variant = (await readBoardPreparationRegistryAsync())[id];
    if (!variant) {
      log.debug("Board preparation skipped", { reason: "not_registered" });
      return;
    }
    const { spec } = variant;
    const session = await resolveViewerAsync(spec);
    const boardRow = await db.query.boards.findFirst({ where: eq(boards.id, spec.boardId), columns: { name: true } });
    if (!boardRow) {
      log.debug("Board preparation skipped", { reason: "board_deleted", boardId: spec.boardId });
      return;
    }
    // The registered ID already selects the Board, including a mobile home.
    // Reload it by its current name rather than selecting a home Board again.
    const context = await loadBoardPreparationContextAsync({
      ...spec,
      session,
      name: boardRow.name,
      deviceType: undefined,
      layout: { layoutId: spec.layoutId },
    });
    if (!context || getBoardPreparationId(getBoardPreparationSpec(context)) !== id) {
      log.debug("Board preparation skipped", { reason: "ineligible_context", boardId: spec.boardId });
      return;
    }
    log.debug("Preparing Board view", {
      boardId: spec.boardId,
      locale: spec.locale,
      layoutId: spec.layoutId,
      widgetCount: context.board.items.length,
    });
    const queryStopwatch = new Stopwatch();
    const fingerprint = getBoardPreparationFingerprint(context);
    const snapshot = createBoardQuerySnapshot(context.board, context.integrations, { preserveTimestamps: true });
    await snapshot.restoreAsync(queryClient);
    const previous = await readPreparedVersionAsync(id);
    if (previous?.fingerprint === fingerprint && previous.validUntil > Date.now()) {
      const retained = await readPreparedBoardAsync(id, String(previous.slot));
      if (retained?.token === previous.token) {
        hydrate(queryClient, {
          mutations: [],
          queries: retained.queries.queries.filter(
            (query) => query.state.dataUpdatedAt > Date.now() - preparationMaxAgeMs,
          ),
        });
      }
    }

    const headers = new Headers({ "x-trpc-source": "board-preparation" });
    const apiContext = createTRPCContext({ headers, session });
    const api = createCaller(apiContext);
    const trpc = createTRPCOptionsProxy({ router: appRouter, ctx: apiContext, queryClient });
    const itemsByKind = new Map<WidgetKind, Item[]>();
    for (const item of context.board.items) {
      const items = itemsByKind.get(item.kind) ?? [];
      items.push(item);
      itemsByKind.set(item.kind, items);
    }
    for (const [kind, items] of itemsByKind) prefetchForKind(kind, queryClient, items);
    // These two consumers suspend instead of rendering an empty query state.
    // Resolve them here so a static render never tries request-cookie transport.
    for (const item of context.board.items) {
      const integrationId = item.integrationIds[0];
      if (!integrationId) continue;
      if (item.kind === "wud") void queryClient.prefetchQuery(trpc.widget.wud.getStats.queryOptions({ integrationId }));
      if (item.kind === "archiveTeamWarrior") {
        void queryClient.prefetchQuery(trpc.widget.archiveTeamWarrior.getStatus.queryOptions({ integrationId }));
      }
    }
    const dependent = prefetchInitialWidgetData(queryClient, context.board, context.layoutId, session !== null, {
      api,
      trpc,
    });
    const queryTimedOut = await Promise.race([
      settleQueriesAsync(queryClient, dependent).then(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(true), 30_000);
      }),
    ]);
    clearTimeout(timer);
    let timedOutRetainedQueryCount = 0;
    if (queryTimedOut) {
      const pendingQueries = queryClient.getQueryCache().findAll({ fetchStatus: "fetching" });
      timedOutRetainedQueryCount = pendingQueries.filter((query) => query.state.data !== undefined).length;
      // Cancellation reverts to the last cached value and its original age.
      // Keep it alongside fast queries, without persisting in-flight promises.
      await queryClient.cancelQueries({ fetchStatus: "fetching" });
      log.warn("Board preparation query budget exceeded; using available data", {
        pendingQueryCount: pendingQueries.length,
        retainedQueryCount: timedOutRetainedQueryCount,
      });
    }
    await snapshot.saveAsync(queryClient);

    const cachedQueries = queryClient.getQueryCache().getAll();
    const failedQueries = cachedQueries.filter((query) => query.state.status === "error");
    const queryDurationMs = Math.round(queryStopwatch.getElapsedInMilliseconds());
    const retainedQueryCount =
      failedQueries.filter((query) => query.state.data !== undefined).length + timedOutRetainedQueryCount;
    log.debug("Board preparation queries settled", {
      durationMs: queryDurationMs,
      queryCount: cachedQueries.length,
      failedQueryCount: failedQueries.length,
      retainedQueryCount,
    });

    const queries = dehydrate(queryClient, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.state.data !== undefined && query.state.fetchStatus !== "fetching",
    });
    // A failed refresh with retained data is still useful presentation data.
    // Never persist a rejected promise or serialize an upstream error into HTML.
    for (const query of queries.queries) {
      query.state = { ...query.state, status: "success", fetchStatus: "idle", error: null, fetchFailureReason: null };
    }
    let slot: 0 | 1 = 0;
    if (previous?.slot === 0) slot = 1;
    const renderStopwatch = new Stopwatch();
    const prepared = await writePreparedBoardAsync(id, slot, { context, queries }, lock, lease);
    const path = `${preparedBoardPath}/${spec.locale}/${id}/${slot}`;
    // Invalidation is committed when its request finishes. Doing it in this
    // request and then fetching would still see the old Full Route Cache entry.
    const invalidatePath = `${preparationEndpoint}?invalidate=${id}&slot=${slot}`;
    const invalidated = await fetch(getPreparationOrigin() + invalidatePath, {
      method: "POST",
      headers: createPreparationHeaders("POST", invalidatePath),
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    await invalidated.arrayBuffer();
    if (!invalidated.ok) throw new Error("Could not invalidate the inactive Board render slot");

    // HTTP 200 alone could be dynamic SSR. Require the expected version and an
    // origin cache HIT before making the new HTML/RSC entry available to visitors.
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(getPreparationOrigin() + path, {
        headers: createPreparationHeaders("GET", path),
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      const html = await response.text();
      const originCache = response.headers.get("x-nextjs-cache");
      const versionMatches = html.includes(`data-homarr-prepared-token="${prepared.token}"`);
      log.debug("Board render cache warmup attempt", {
        attempt: attempt + 1,
        statusCode: response.status,
        originCache,
        versionMatches,
      });
      if (!response.ok) {
        throw new Error("Prepared Board did not produce the expected HTML");
      }
      if (originCache === "HIT" && versionMatches) {
        const latestBoard = await db.query.boards.findFirst({
          where: eq(boards.id, spec.boardId),
          columns: { name: true },
        });
        if (!latestBoard) {
          log.debug("Board preparation skipped", { reason: "board_deleted", boardId: spec.boardId });
          return;
        }
        const latest = await loadBoardPreparationContextAsync({
          ...spec,
          session: await resolveViewerAsync(spec),
          name: latestBoard.name,
          deviceType: undefined,
          layout: { layoutId: spec.layoutId },
        });
        // A mutation may finish while slow Integrations or rendering run. Retry
        // with the new inputs rather than publishing a superseded presentation.
        if (!latest || getBoardPreparationFingerprint(latest) !== fingerprint) {
          log.debug("Board preparation needs retry", { reason: "inputs_changed", boardId: spec.boardId });
          return "changed" as const;
        }
        let validUntil = Date.now() + preparationMaxAgeMs;
        if (session) validUntil = Math.min(validUntil, Date.parse(session.expires));
        if (
          !(await publishPreparedBoardAsync(
            id,
            {
              slot,
              fingerprint,
              token: prepared.token,
              validUntil,
              preparedAt: Date.now(),
            },
            lock,
            lease,
          ))
        )
          throw new Error("Board preparation lease expired before publication");
        log.info("Prepared Board view published", {
          boardId: spec.boardId,
          durationMs: Math.round(stopwatch.getElapsedInMilliseconds()),
          queryDurationMs,
          renderDurationMs: Math.round(renderStopwatch.getElapsedInMilliseconds()),
          queryCount: queries.queries.length,
          failedQueryCount: failedQueries.length,
          retainedQueryCount,
          queryTimedOut,
          renderAttempts: attempt + 1,
          slot,
        });
        return "prepared" as const;
      }
      await delay(100);
    }
    throw new Error("Prepared Board did not enter the origin page cache");
  } finally {
    clearTimeout(timer);
    queryClient.clear();
    await lock.releaseAsync(lease);
    if (capacity && capacityLease) await capacity.releaseAsync(capacityLease);
  }
};

const discoverHomeBoardsAsync = async () => {
  const settings = await getServerSettingsAsync(db);
  const activeSessions = await db.query.sessions.findMany({
    columns: { userId: true, expires: true },
    where: gt(sessions.expires, new Date()),
    orderBy: desc(sessions.expires),
    limit: 32,
  });
  const viewers = new Map<string | null, Session | null>([[null, null]]);
  for (const row of activeSessions) {
    if (viewers.has(row.userId)) continue;
    try {
      viewers.set(
        row.userId,
        await resolveViewerAsync({ viewerId: row.userId, sessionExpires: row.expires.toISOString() }),
      );
    } catch {
      /* Deleted or expiring sessions remain on the ordinary route. */
    }
  }
  for (const session of viewers.values()) {
    for (const deviceType of [undefined, "mobile"] as const) {
      try {
        const context = await loadBoardPreparationContextAsync({
          session,
          deviceType,
          layout: { viewportWidth: 0 },
          locale: settings.culture.defaultLocale,
        });
        if (!context) continue;
        for (const { id: layoutId } of context.board.layouts) {
          const layoutContext = withPreparedLayout(context, layoutId);
          if (!layoutContext) continue;
          const spec = getBoardPreparationSpec(layoutContext);
          await rememberBoardPreparationAsync(getBoardPreparationId(spec), spec);
        }
      } catch {
        /* No accessible home Board is a normal first-run condition. */
      }
    }
  }
};

export const prepareRegisteredBoardsAsync = async (id?: string, boardId?: string, signal?: AbortSignal) => {
  if (!(await getPreparationNamespaceAsync())) {
    logger.debug("Board preparation run skipped", { reason: "no_production_build" });
    return;
  }
  const runId = createId();
  const log = logger.child({ runId });
  const stopwatch = new Stopwatch();
  let scope = "recent";
  if (boardId) scope = "board";
  if (id) scope = "view";
  log.info("Board preparation run started", { scope });
  const deadline = Date.now() + 60_000;
  if (!id && !boardId) await discoverHomeBoardsAsync();
  let ids = [id];
  if (!id) {
    const registry = await readBoardPreparationRegistryAsync();
    ids = Object.entries(registry)
      .filter(([, variant]) => variant.lastSeenAt > Date.now() - preparationMaxAgeMs)
      .filter(([, variant]) => boardId === undefined || variant.spec.boardId === boardId)
      .toSorted((a, b) => b[1].lastSeenAt - a[1].lastSeenAt)
      .map(([key]) => key);
    const versions = new Map(
      await Promise.all(ids.map(async (key) => [key, key ? await readPreparedVersionAsync(key) : null] as const)),
    );
    ids = ids.toSorted((a, b) => (versions.get(a)?.preparedAt ?? 0) - (versions.get(b)?.preparedAt ?? 0));
  }
  // One render at a time keeps the burst from monopolizing the dashboard process.
  const failures: unknown[] = [];
  let preparedCount = 0;
  let skippedCount = 0;
  for (const viewId of ids) {
    if (signal?.aborted || Date.now() >= deadline) {
      let reason = "time_budget";
      if (signal?.aborted) reason = "request_aborted";
      log.debug("Board preparation run stopped early", { reason });
      break;
    }
    if (!viewId) continue;
    try {
      let result = await prepareBoardAsync(viewId, runId);
      if (result === "changed") result = await prepareBoardAsync(viewId, runId);
      if (result === "changed") throw new Error("Board inputs changed during both preparation attempts");
      if (result === "prepared") preparedCount++;
      else skippedCount++;
    } catch (cause) {
      failures.push(cause);
      log
        .child({ viewId: viewId.slice(0, 12) })
        .warn(new Error("Could not prepare a Board; its ordinary route remains available", { cause }));
    }
  }
  log.info("Board preparation run finished", {
    durationMs: Math.round(stopwatch.getElapsedInMilliseconds()),
    candidateCount: ids.length,
    preparedCount,
    skippedCount,
    failedCount: failures.length,
    deferredCount: ids.length - preparedCount - skippedCount - failures.length,
  });
  if (failures.length > 0) throw new AggregateError(failures, "Some Board views could not be prepared");
};
