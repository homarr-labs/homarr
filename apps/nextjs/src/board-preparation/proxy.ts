import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionFromToken, sessionTokenCookieName } from "@homarr/auth/server";
import { boardViewportWidthCookieName } from "@homarr/boards/layout-selection";
import { userAgent } from "@homarr/common/server";
import { db, eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";
import { colorSchemeCookieKey } from "@homarr/definitions";
import {
  createPreparationHeaders,
  getPreparationOrigin,
  preparedBoardPath,
  requestBoardPreparationAsync,
} from "@homarr/cron-jobs/board-preparation";
import type { SupportedLanguage } from "@homarr/translation";

import { getBoardPreparationSpec, loadBoardPreparationContextAsync } from "./context";
import {
  getBoardPreparationFingerprint,
  getBoardPreparationId,
  getPreparationNamespaceAsync,
  readBoardPreparationRegistryAsync,
  readPreparedVersionAsync,
  rememberBoardPreparationAsync,
} from "./store";

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
  localizedResponse: NextResponse,
) => {
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
    viewportWidth: getViewportWidth(request),
    colorScheme,
    deviceType: userAgent(request.headers).device.type,
  });
  if (!context) return null;
  const spec = getBoardPreparationSpec(context);
  const id = getBoardPreparationId(spec);
  const fingerprint = getBoardPreparationFingerprint(context);
  const ready = await readPreparedVersionAsync(id);
  const usable = ready && ready.fingerprint === fingerprint && ready.validUntil > Date.now() + 30_000;

  if (!registry[id] || registry[id].lastSeenAt < Date.now() - 60_000 || !usable) {
    await rememberBoardPreparationAsync(id, spec);
  }
  if (!usable) {
    // The current request keeps its existing SSR path; preparation is independent.
    const configuration = await db.query.cronJobConfigurations.findFirst({
      where: eq(cronJobConfigurations.name, "boardPreparation"),
      columns: { isEnabled: true },
    });
    if (configuration?.isEnabled !== false) await requestBoardPreparationAsync({ viewId: id });
    return null;
  }
  const path = `${preparedBoardPath}/${locale}/${id}/${ready.slot}${request.nextUrl.search}`;
  // Always target our own listener. Never send an internal proof to a Host or
  // forwarded-host supplied by the visitor. Some local hostname configurations
  // proxy the rewrite through HTTP; that second hop must carry the same proof.
  const url = new URL(path, getPreparationOrigin());
  const requestHeaders = new Headers(request.headers);
  for (const [key, value] of Object.entries(createPreparationHeaders(request.method, path)))
    requestHeaders.set(key, value);
  const response = NextResponse.rewrite(url, {
    headers: localizedResponse.headers,
    request: { headers: requestHeaders },
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Homarr-Board-Cache", "HIT");
  return response;
};

export const getPreparedBoardResponseAsync = async (
  request: NextRequest,
  event: NextFetchEvent,
  localizedResponse: NextResponse,
) => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!(await getPreparationNamespaceAsync())) return null;
  const rewrite = localizedResponse.headers.get("x-middleware-rewrite");
  if (!rewrite || localizedResponse.status !== 200) return null;
  const path = new URL(rewrite).pathname.split("/").filter(Boolean);
  // This includes the locale middleware's rewritten home route, /{locale}.
  if (path.length !== 1 && !(path.length === 3 && path[1] === "boards")) return null;
  if ([...request.nextUrl.searchParams.keys()].some((key) => key !== "_rsc")) return null;
  const locale = path[0] as SupportedLanguage;
  let name: string | undefined;
  if (path.length === 3 && path[2]) name = decodeURIComponent(path[2]);
  const pending = resolvePreparedResponseAsync(request, locale, name, localizedResponse).catch(() => null);
  event.waitUntil(pending.then(() => undefined));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // A cache outage or a cold preparation must not hold up ordinary SSR.
    return await Promise.race([
      pending,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 100);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};
