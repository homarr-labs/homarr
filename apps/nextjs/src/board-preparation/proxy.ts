import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth/server";
import { boardViewportWidthCookieName } from "@homarr/boards/layout-selection";
import { userAgent } from "@homarr/common/server";
import { Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";
import { colorSchemeCookieKey } from "@homarr/definitions";
import { requestBoardPreparationAsync } from "@homarr/cron-jobs/board-preparation";
import type { SupportedLanguage } from "@homarr/translation";

import { getBoardPreparationSpec, loadBoardPreparationContextAsync } from "./context";
import {
  getBoardPreparationFingerprint,
  getBoardPreparationId,
  getPreparationNamespaceAsync,
  readBoardPreparationRegistryAsync,
  readPreparedDocumentAsync,
  readPreparedVersionAsync,
  rememberBoardPreparationAsync,
} from "./store";

const logger = createLogger({ module: "boardPreparation", scope: "cache" });
const pendingPreparations = new Map<string, Promise<void>>();
const cacheHeader = "X-Homarr-Board-Cache";

type Lookup = { hit: true; html: string; viewId: string; preparedAt: number } | { hit: false; reason: string };

const readViewportWidth = (request: NextRequest) => {
  for (const value of [
    request.cookies.get(boardViewportWidthCookieName)?.value,
    request.headers.get("sec-ch-viewport-width"),
  ]) {
    const width = Number(value);
    if (Number.isInteger(width) && width >= 200 && width <= 10_000) return width;
  }
  return undefined;
};

const getViewportWidth = (request: NextRequest) => {
  const width = readViewportWidth(request);
  if (width !== undefined) return width;
  const agent = request.headers.get("user-agent") ?? "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(agent)) return 1024;
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(agent)) return 390;
  return 1440;
};

const requestPreparationAsync = async (id: string) => {
  const configuration = await db.query.cronJobConfigurations.findFirst({
    where: eq(cronJobConfigurations.name, "boardPreparation"),
    columns: { isEnabled: true },
  });
  if (configuration?.isEnabled === false) {
    logger.debug("Board preparation request skipped", { reason: "task_disabled", viewId: id.slice(0, 12) });
    return;
  }
  await requestBoardPreparationAsync({ viewId: id });
};

const requestPreparation = (id: string, backgroundWork: Promise<void>[]) => {
  let preparation = pendingPreparations.get(id);
  if (!preparation) {
    preparation = requestPreparationAsync(id)
      .catch((cause: unknown) => {
        let errorType: string = typeof cause;
        if (cause instanceof Error) errorType = cause.name;
        logger.warn("Could not request Board preparation", { viewId: id.slice(0, 12), errorType });
      })
      .finally(() => pendingPreparations.delete(id));
    pendingPreparations.set(id, preparation);
  }
  backgroundWork.push(preparation);
  return preparation;
};

const resolvePreparedResponseAsync = async (
  request: NextRequest,
  locale: SupportedLanguage,
  name: string | undefined,
  backgroundWork: Promise<void>[],
): Promise<Lookup> => {
  const [session, registry] = await Promise.all([
    getSessionFromToken(db, request.cookies.get(sessionTokenCookieName)?.value),
    readBoardPreparationRegistryAsync(),
  ]);
  const cookieScheme = request.cookies.get(colorSchemeCookieKey)?.value;
  let colorScheme: "light" | "dark" | "auto" | undefined;
  if (cookieScheme === "light" || cookieScheme === "dark" || cookieScheme === "auto") colorScheme = cookieScheme;
  const context = await loadBoardPreparationContextAsync({
    session,
    locale,
    name,
    layout: { viewportWidth: getViewportWidth(request) },
    colorScheme,
    deviceType: userAgent(request.headers).device.type,
  });
  if (!context) return { hit: false, reason: "ineligible" };
  let deviceType: "mobile" | null = null;
  if (name === undefined && userAgent(request.headers).device.type === "mobile") deviceType = "mobile";
  const spec = getBoardPreparationSpec(context, { pathname: request.nextUrl.pathname, deviceType });
  const id = getBoardPreparationId(spec);
  const fingerprint = getBoardPreparationFingerprint(context);
  const ready = await readPreparedVersionAsync(id);
  const usable = ready && ready.fingerprint === fingerprint && ready.validUntil > Date.now() + 30_000;
  const viewportWidth = readViewportWidth(request);
  const variant = registry[id];
  const stale = !variant || variant.lastSeenAt < Date.now() - 60_000;

  if (!usable) {
    const registered = await rememberBoardPreparationAsync(id, spec, viewportWidth);
    if (!registered) return { hit: false, reason: "registration_unavailable" };
  } else if (stale) {
    // Last-seen bookkeeping must not turn an authorized cache hit into slow SSR.
    backgroundWork.push(
      rememberBoardPreparationAsync(id, spec, viewportWidth)
        .then(async () => {
          if (variant && viewportWidth !== undefined && variant.viewportWidth !== viewportWidth) {
            await requestPreparation(id, backgroundWork);
          }
        })
        .catch(() => {
          logger.debug("Could not refresh prepared Board registration", { viewId: id.slice(0, 12) });
        }),
    );
  }
  if (!usable) {
    let reason = "missing";
    if (ready) {
      reason = "expired";
      if (ready.fingerprint !== fingerprint) reason = "inputs_changed";
    }
    logger.debug("Prepared Board cache miss", { reason, viewId: id.slice(0, 12), boardId: spec.boardId });
    requestPreparation(id, backgroundWork);
    return { hit: false, reason };
  }
  const html = await readPreparedDocumentAsync(id, ready.token);
  if (!html) {
    requestPreparation(id, backgroundWork);
    return { hit: false, reason: "document_unavailable" };
  }
  return { hit: true, html, viewId: id.slice(0, 12), preparedAt: ready.preparedAt };
};

export const getPreparedBoardResponseAsync = async (
  request: NextRequest,
  event: NextFetchEvent,
  localizedResponse: NextResponse,
) => {
  const rewrite = localizedResponse.headers.get("x-middleware-rewrite");
  if (!rewrite || localizedResponse.status !== 200) return null;
  const path = new URL(rewrite).pathname.split("/").filter(Boolean);
  if (path.length !== 1 && !(path.length === 3 && path[1] === "boards")) return null;
  const bypass = (reason: string) => {
    localizedResponse.headers.set(cacheHeader, `BYPASS; reason=${reason}`);
    return null;
  };
  if (!(await getPreparationNamespaceAsync())) return bypass("no_production_build");

  const locale = path[0] as SupportedLanguage;
  let name: string | undefined;
  if (path.length === 3 && path[2]) {
    try {
      name = decodeURIComponent(path[2]);
    } catch {
      return bypass("invalid_path");
    }
  }
  const stopwatch = new Stopwatch();
  const backgroundWork: Promise<void>[] = [];
  const pending = resolvePreparedResponseAsync(request, locale, name, backgroundWork).catch(
    (cause: unknown): Lookup => {
      if (cause instanceof TRPCError) return { hit: false, reason: "no_board_access" };
      let errorType: string = typeof cause;
      if (cause instanceof Error) errorType = cause.name;
      logger.debug("Prepared Board cache lookup failed; using ordinary SSR", { errorType });
      return { hit: false, reason: "lookup_failed" };
    },
  );
  event.waitUntil(pending.then(() => Promise.all(backgroundWork)).then(() => undefined));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      pending,
      new Promise<Lookup>((resolve) => {
        timeout = setTimeout(() => resolve({ hit: false, reason: "lookup_budget_exceeded" }), 100);
      }),
    ]);
    const durationMs = Math.round(stopwatch.getElapsedInMilliseconds());
    if (!result.hit) {
      logger.debug("Using ordinary Board SSR", { reason: result.reason, durationMs });
      localizedResponse.headers.set(cacheHeader, `MISS; reason=${result.reason}`);
      return null;
    }
    const ageSeconds = Math.max(0, Math.round((Date.now() - result.preparedAt) / 1000));
    logger.debug("Serving prepared Board view", { viewId: result.viewId, ageSeconds, durationMs });
    const headers = new Headers();
    for (const [key, value] of localizedResponse.headers) {
      if (!key.startsWith("x-middleware-")) headers.append(key, value);
    }
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set(cacheHeader, `HIT; age=${ageSeconds}`);
    let body: string | null = result.html;
    if (request.method === "HEAD") body = null;
    return new NextResponse(body, { status: 200, headers });
  } finally {
    clearTimeout(timeout);
  }
};
