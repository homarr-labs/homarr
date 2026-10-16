import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "@homarr/api/legacy";
import { getTrpcUrl } from "@homarr/api/shared";
import { localeCookieKey } from "@homarr/definitions/cookie";
import type { SupportedLanguage } from "@homarr/translation/languages";
import { supportedLanguages } from "@homarr/translation/languages";
import { createI18nMiddleware } from "@homarr/translation/middleware";

import { isWorkerFrontend } from "./worker/mode";

const backend = createTRPCClient<AppRouter>({
  links: [httpLink({ url: getTrpcUrl(), transformer: SuperJSON, headers: { "x-trpc-source": "next-proxy" } })],
});

let isOnboardingFinished = false;
let routingPromise: ReturnType<typeof backend.frontend.routing.query> | null = null;

const getRoutingDedupedAsync = () => {
  routingPromise ??= backend.frontend.routing.query().finally(() => {
    routingPromise = null;
  });
  return routingPromise;
};

export async function proxy(request: NextRequest) {
  if (isWorkerFrontend()) return proxyWorkerFrontend(request);
  if (/^\/(api|rpc)(\/|$)/.test(request.nextUrl.pathname)) return NextResponse.next();
  if (request.nextUrl.pathname.includes(".")) return NextResponse.next();
  let requestRouting: ReturnType<typeof backend.frontend.routing.query> | undefined;
  const getRequestRoutingAsync = () => {
    requestRouting ??= getRoutingDedupedAsync();
    return requestRouting;
  };
  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = supportedLanguages.includes(segments[0] as SupportedLanguage) ? segments.slice(1) : segments;
  const isOnboardingAccessRoute =
    (routeSegments.length === 1 && routeSegments[0] === "init") ||
    (routeSegments.length === 2 && routeSegments[0] === "auth" && routeSegments[1] === "login");

  if (!isOnboardingFinished && !isOnboardingAccessRoute) {
    const { step: currentOnboardingStep } = await getRequestRoutingAsync();
    if (currentOnboardingStep !== "finish") {
      return NextResponse.redirect(new URL("/init", request.url));
    }

    isOnboardingFinished = true;
  }

  // Only run this if the user has not already configured their language
  const currentLocale = request.cookies.get(localeCookieKey)?.value;
  let defaultLocale: SupportedLanguage = "en";
  if (!currentLocale || !supportedLanguages.includes(currentLocale as SupportedLanguage)) {
    const { defaultLocale: configuredLocale } = await getRequestRoutingAsync();
    if (supportedLanguages.includes(configuredLocale as SupportedLanguage)) {
      defaultLocale = configuredLocale as SupportedLanguage;
    }
  }

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");

  const next = createI18nMiddleware(defaultLocale);
  return next(request);
}

function proxyWorkerFrontend(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api/frontend/health") return NextResponse.next();
  if (
    /^\/(images|logo)\//.test(pathname) ||
    pathname === "/sw.js" ||
    pathname === "/sql-wasm.wasm" ||
    pathname === "/manifest.webmanifest"
  )
    return NextResponse.next();
  const platformPath = process.env.HOMARR_PLATFORM_PATH ?? "/platform";
  if (pathname === platformPath || pathname.startsWith(`${platformPath}/`)) return NextResponse.next();
  // Browser requests must use the selected worker transport, never a host-local API.
  if (/^\/(api|rpc|well-known|\.well-known)(\/|$)/.test(pathname)) {
    return NextResponse.json({ error: "Connect a worker to access its API." }, { status: 404 });
  }
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] as SupportedLanguage | undefined;
  let locale: SupportedLanguage = "en";
  if (firstSegment && supportedLanguages.includes(firstSegment)) {
    locale = firstSegment;
    segments.shift();
  } else {
    const cookieLocale = request.cookies.get(localeCookieKey)?.value as SupportedLanguage | undefined;
    if (cookieLocale && supportedLanguages.includes(cookieLocale)) locale = cookieLocale;
  }
  const destination = new URL(request.url);
  if (segments[0] === "worker-shell") return NextResponse.next();
  let route = `/${locale}/worker-shell`;
  if (segments.length) route += `/${segments.join("/")}`;
  destination.pathname = route;
  // Keep Next's normalized origin. Substituting the public reverse-proxy Host
  // would turn this into an outbound proxy request to the public frontend.
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!static|_next|favicon.ico|robots.txt).*)"],
};
