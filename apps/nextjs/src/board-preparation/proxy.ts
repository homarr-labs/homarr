import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

const getViewportWidth = (request: NextRequest) => {
  for (const value of [
    request.cookies.get(boardViewportWidthCookieName)?.value,
    request.headers.get("sec-ch-viewport-width"),
  ]) {
    const width = Number(value);
    if (Number.isInteger(width) && width >= 200 && width <= 10_000) return width;
  }
  const agent = request.headers.get("user-agent") ?? "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(agent)) return 1024;
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(agent)) return 390;
  return 1440;
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

  if (!registry[id] || registry[id].lastSeenAt < Date.now() - 60_000 || !usable) {
    const registered = await rememberBoardPreparationAsync(id, spec);
    if (!registered && !usable) return { hit: false, reason: "registration_unavailable" };
  }
  if (!usable) {
    let reason = "missing";
    if (ready) {
      reason = "expired";
      if (ready.fingerprint !== fingerprint) reason = "inputs_changed";
    }
    logger.debug("Prepared Board cache miss", { reason, viewId: id.slice(0, 12), boardId: spec.boardId });
    // The current request keeps its existing SSR path; preparation is independent.
    const configuration = await db.query.cronJobConfigurations.findFirst({
      where: eq(cronJobConfigurations.name, "boardPreparation"),
      columns: { isEnabled: true },
    });
    if (configuration?.isEnabled !== false) {
      let preparation = pendingPreparations.get(id);
      if (!preparation) {
        preparation = requestBoardPreparationAsync({ viewId: id })
          .catch((cause: unknown) => {
            let errorType: string = typeof cause;
            if (cause instanceof Error) errorType = cause.name;
            logger.warn("Could not request Board preparation", { viewId: id.slice(0, 12), errorType });
          })
          .finally(() => pendingPreparations.delete(id));
        pendingPreparations.set(id, preparation);
      }
      backgroundWork.push(preparation);
    } else logger.debug("Board preparation request skipped", { reason: "task_disabled", viewId: id.slice(0, 12) });
    return { hit: false, reason };
  }
  // A concurrent publication can replace the document after the marker read.
  const html = await readPreparedDocumentAsync(id, ready.token);
  if (!html) return { hit: false, reason: "document_unavailable" };
  return { hit: true, html, viewId: id.slice(0, 12), preparedAt: ready.preparedAt };
};

// Client navigations, prefetches and Server Actions carry router state and
// need RSC payloads. Only a plain document load can reuse a captured page.
const isDocumentRequest = (request: NextRequest) => {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  for (const header of ["rsc", "next-router-prefetch", "next-router-state-tree", "next-action", "purpose"]) {
    if (request.headers.has(header)) return false;
  }
  if (request.headers.get("sec-purpose")?.includes("prefetch")) return false;
  const destination = request.headers.get("sec-fetch-dest");
  return destination === null || destination === "document";
};

/**
 * Serves a Prepared Board view for a plain document request, after checking
 * the visitor's session, Board access and render inputs. Otherwise annotates
 * the ordinary response with the reason and lets SSR continue.
 */
export const getPreparedBoardResponseAsync = async (
  request: NextRequest,
  event: NextFetchEvent,
  localizedResponse: NextResponse,
) => {
  const rewrite = localizedResponse.headers.get("x-middleware-rewrite");
  if (!rewrite || localizedResponse.status !== 200) return null;
  const path = new URL(rewrite).pathname.split("/").filter(Boolean);
  // This includes the locale middleware's rewritten home route, /{locale}.
  if (path.length !== 1 && !(path.length === 3 && path[1] === "boards")) return null;
  const bypass = (reason: string) => {
    localizedResponse.headers.set(cacheHeader, `BYPASS; reason=${reason}`);
    return null;
  };
  if (!(await getPreparationNamespaceAsync())) return bypass("no_production_build");
  if (!isDocumentRequest(request)) return null;
  if (request.nextUrl.search) return bypass("query_parameters");
  const locale = path[0] as SupportedLanguage;
  let name: string | undefined;
  if (path.length === 3 && path[2]) name = decodeURIComponent(path[2]);
  const stopwatch = new Stopwatch();
  const backgroundWork: Promise<void>[] = [];
  const pending = resolvePreparedResponseAsync(request, locale, name, backgroundWork).catch(
    (cause: unknown): Lookup => {
      // Database errors can include query parameters such as session tokens.
      let errorType: string = typeof cause;
      if (cause instanceof Error) errorType = cause.name;
      logger.debug("Prepared Board cache lookup failed; using ordinary SSR", { errorType });
      return { hit: false, reason: "lookup_failed" };
    },
  );
  // Register the whole lifetime now: a slow lookup can schedule preparation
  // after the response budget, when Next has already captured waitUntil work.
  event.waitUntil(pending.then(() => Promise.all(backgroundWork)).then(() => undefined));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // A cache outage or a cold preparation must not hold up ordinary SSR.
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
