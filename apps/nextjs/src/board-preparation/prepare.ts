import { randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { createSessionAsync, sessionTokenCookieName } from "@homarr/auth/server";
import { boardViewportWidthCookieName } from "@homarr/boards/layout-selection";
import { createId, Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createCaptureHeaders, getPreparationOrigin } from "@homarr/cron-jobs/board-preparation";
import { and, db, desc, eq, gt, like, notLike } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import { sessions, users } from "@homarr/db/schema";
import { colorSchemeCookieKey } from "@homarr/definitions";
import { localeCookieKey } from "@homarr/definitions/cookie";

import { getBoardPreparationSpec, loadBoardPreparationContextAsync, withPreparedLayout } from "./context";
import {
  createBoardPreparationLockAsync,
  forgetBoardPreparationAsync,
  getBoardPreparationFingerprint,
  getBoardPreparationId,
  getPreparationNamespaceAsync,
  preparationMaxAgeMs,
  readBoardPreparationRegistryAsync,
  readPreparedVersionAsync,
  rememberBoardPreparationAsync,
  writePreparedDocumentAsync,
} from "./store";
import type { BoardPreparationSpec } from "./store";

const logger = createLogger({ module: "boardPreparation" });
const captureSessionPrefix = "board-preparation-capture:";

const resolveViewerAsync = async (
  spec: Pick<BoardPreparationSpec, "viewerId" | "sessionExpires">,
): Promise<Session | null> => {
  if (spec.viewerId === null) return null;
  if (!spec.sessionExpires || Date.parse(spec.sessionExpires) <= Date.now() + 30_000) {
    throw new Error("Prepared viewer has no current session lifetime");
  }
  const activeSession = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, spec.viewerId),
      eq(sessions.expires, new Date(spec.sessionExpires)),
      notLike(sessions.sessionToken, `${captureSessionPrefix}%`),
    ),
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

const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const loadSpecContextAsync = async (spec: BoardPreparationSpec, session: Session | null) => {
  let name: string | undefined;
  if (spec.pathname !== "/") name = spec.boardName;
  try {
    return await loadBoardPreparationContextAsync({
      session,
      name,
      deviceType: spec.deviceType ?? undefined,
      locale: spec.locale,
      colorScheme: spec.colorScheme,
      layout: { layoutId: spec.layoutId },
    });
  } catch (cause) {
    if (cause instanceof TRPCError) return null;
    throw cause;
  }
};

const withCaptureSessionAsync = async <T>(
  spec: BoardPreparationSpec,
  callback: (token: string | null) => Promise<T>,
) => {
  if (!spec.viewerId || !spec.sessionExpires) return await callback(null);
  const sessionToken = `${captureSessionPrefix}${Date.now()}:${randomBytes(32).toString("hex")}`;
  await db.insert(sessions).values({
    sessionToken,
    userId: spec.viewerId,
    expires: new Date(spec.sessionExpires),
  });
  try {
    return await callback(sessionToken);
  } finally {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  }
};

const removeAbandonedCaptureSessionsAsync = async () => {
  const rows = await db.query.sessions.findMany({
    where: like(sessions.sessionToken, `${captureSessionPrefix}%`),
    columns: { sessionToken: true },
  });
  const abandoned = rows
    .map(({ sessionToken }) => sessionToken)
    .filter((token) => Number(token.slice(captureSessionPrefix.length).split(":")[0]) < Date.now() - 10 * 60_000);
  for (const sessionToken of abandoned) await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
};

const captureDocumentAsync = async (
  id: string,
  spec: BoardPreparationSpec,
  viewportWidth: number,
  signal?: AbortSignal,
) =>
  await withCaptureSessionAsync(spec, async (sessionToken) => {
    const cookies = [
      `${localeCookieKey}=${spec.locale}`,
      `${colorSchemeCookieKey}=${spec.colorScheme}`,
      `${boardViewportWidthCookieName}=${viewportWidth}`,
    ];
    if (sessionToken) cookies.push(`${sessionTokenCookieName}=${sessionToken}`);
    let userAgent = desktopUserAgent;
    if (spec.deviceType === "mobile") userAgent = mobileUserAgent;
    const response = await fetch(getPreparationOrigin() + spec.pathname, {
      headers: {
        ...createCaptureHeaders(id),
        accept: "text/html",
        cookie: cookies.join("; "),
        "user-agent": userAgent,
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.any([AbortSignal.timeout(90_000), ...(signal ? [signal] : [])]),
    });
    const html = await response.text();
    if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) {
      throw new Error(`Board capture returned HTTP ${response.status}`);
    }
    if (!html.includes('data-testid="board-canvas"')) throw new Error("Board capture did not render the Board");
    return html.replaceAll(revealThrottleTimestamp, "");
  });

const revealThrottleTimestamp = "$RT=performance.now()";
const countStreamedReveals = (html: string) => html.split("$RC(").length - 1;

export const prepareBoardAsync = async (id: string, runId?: string, signal?: AbortSignal) => {
  signal?.throwIfAborted();
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
    let session: Session | null;
    try {
      session = await resolveViewerAsync(spec);
    } catch {
      await forgetBoardPreparationAsync(id);
      log.debug("Board preparation skipped", { reason: "viewer_session_ended" });
      return;
    }
    const context = await loadSpecContextAsync(spec, session);
    if (!context || getBoardPreparationId(getBoardPreparationSpec(context, spec)) !== id) {
      log.debug("Board preparation skipped", { reason: "ineligible_context", boardId: spec.boardId });
      return;
    }
    const fingerprint = getBoardPreparationFingerprint(context);
    signal?.throwIfAborted();
    log.debug("Capturing Board view", { boardId: spec.boardId, locale: spec.locale, layoutId: spec.layoutId });
    const captureStopwatch = new Stopwatch();
    const html = await captureDocumentAsync(id, spec, variant.viewportWidth ?? context.viewportWidth, signal);
    const captureDurationMs = Math.round(captureStopwatch.getElapsedInMilliseconds());

    const latest = await loadSpecContextAsync(spec, await resolveViewerAsync(spec));
    signal?.throwIfAborted();
    if (!latest || getBoardPreparationFingerprint(latest) !== fingerprint) {
      log.debug("Board preparation needs retry", { reason: "inputs_changed", boardId: spec.boardId });
      return "changed" as const;
    }
    let validUntil = Date.now() + preparationMaxAgeMs;
    if (session) validUntil = Math.min(validUntil, Date.parse(session.expires));
    const token = randomUUID();
    const preparedAt = Date.now();
    if (
      !(await writePreparedDocumentAsync(
        id,
        { token, html },
        { fingerprint, token, validUntil, preparedAt },
        lock,
        lease,
      ))
    )
      throw new Error("Board preparation lease expired before publication");
    log.info("Prepared Board view published", {
      boardId: spec.boardId,
      durationMs: Math.round(stopwatch.getElapsedInMilliseconds()),
      captureDurationMs,
      streamedReveals: countStreamedReveals(html),
      documentBytes: Buffer.byteLength(html),
    });
    return "prepared" as const;
  } finally {
    await lock.releaseAsync(lease);
    if (capacity && capacityLease) await capacity.releaseAsync(capacityLease);
  }
};

const discoverHomeBoardsAsync = async (signal: AbortSignal) => {
  const settings = await getServerSettingsAsync(db);
  const activeSessions = await db.query.sessions.findMany({
    columns: { userId: true, expires: true },
    where: and(gt(sessions.expires, new Date()), notLike(sessions.sessionToken, `${captureSessionPrefix}%`)),
    orderBy: desc(sessions.expires),
    limit: 32,
  });
  const viewers = new Map<string | null, Session | null>([[null, null]]);
  for (const row of activeSessions) {
    if (signal.aborted) return;
    if (viewers.has(row.userId)) continue;
    try {
      viewers.set(
        row.userId,
        await resolveViewerAsync({ viewerId: row.userId, sessionExpires: row.expires.toISOString() }),
      );
    } catch {
      continue;
    }
  }
  for (const session of viewers.values()) {
    if (signal.aborted) return;
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
          if (signal.aborted) return;
          const layoutContext = withPreparedLayout(context, layoutId);
          if (!layoutContext) continue;
          const spec = getBoardPreparationSpec(layoutContext, { pathname: "/", deviceType: deviceType ?? null });
          await rememberBoardPreparationAsync(getBoardPreparationId(spec), spec);
        }
      } catch {
        continue;
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
  const deadline = Date.now() + 4 * 60_000;
  const runSignal = AbortSignal.any([AbortSignal.timeout(4 * 60_000), ...(signal ? [signal] : [])]);
  await removeAbandonedCaptureSessionsAsync();
  if (!id && !boardId) await discoverHomeBoardsAsync(runSignal);
  let ids = [id];
  if (!id) {
    const registry = await readBoardPreparationRegistryAsync();
    ids = Object.entries(registry)
      .filter(([, variant]) => variant.lastSeenAt > Date.now() - preparationMaxAgeMs)
      .filter(([, variant]) => boardId === undefined || variant.spec.boardId === boardId)
      .toSorted((leftEntry, rightEntry) => rightEntry[1].lastSeenAt - leftEntry[1].lastSeenAt)
      .map(([key]) => key);
    const versions = new Map(
      await Promise.all(ids.map(async (key) => [key, key ? await readPreparedVersionAsync(key) : null] as const)),
    );
    ids = ids.toSorted(
      (leftId, rightId) => (versions.get(leftId)?.preparedAt ?? 0) - (versions.get(rightId)?.preparedAt ?? 0),
    );
  }
  const failures: unknown[] = [];
  let preparedCount = 0;
  let skippedCount = 0;
  for (const viewId of ids) {
    if (runSignal.aborted || Date.now() >= deadline) {
      let reason = "time_budget";
      if (signal?.aborted) reason = "request_aborted";
      log.debug("Board preparation run stopped early", { reason });
      break;
    }
    if (!viewId) continue;
    try {
      let result = await prepareBoardAsync(viewId, runId, runSignal);
      if (runSignal.aborted) break;
      if (result === "changed") result = await prepareBoardAsync(viewId, runId, runSignal);
      if (result === "changed") throw new Error("Board inputs changed during both preparation attempts");
      if (result === "prepared") preparedCount++;
      else skippedCount++;
    } catch (cause) {
      if (runSignal.aborted) break;
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
