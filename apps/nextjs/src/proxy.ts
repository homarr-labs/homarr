import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getDefaultLocaleForProxyAsync, getOnboardingStepForProxyAsync } from "@homarr/db/proxy-reader";
import { localeCookieKey } from "@homarr/definitions/cookie";
import type { SupportedLanguage } from "@homarr/translation/languages";
import { supportedLanguages } from "@homarr/translation/languages";
import { createI18nMiddleware } from "@homarr/translation/middleware";

let isOnboardingFinished = false;
let onboardingStepPromise: Promise<string> | null = null;
let defaultLocalePromise: Promise<string> | null = null;

const getOnboardingStepDedupedAsync = () => {
  onboardingStepPromise ??= getOnboardingStepForProxyAsync().then(
    (step) => {
      onboardingStepPromise = null;
      return step;
    },
    (error: unknown) => {
      onboardingStepPromise = null;
      throw error;
    },
  );
  return onboardingStepPromise;
};

const getDefaultLocaleDedupedAsync = () => {
  defaultLocalePromise ??= getDefaultLocaleForProxyAsync().then(
    (locale) => {
      defaultLocalePromise = null;
      return locale;
    },
    (error: unknown) => {
      defaultLocalePromise = null;
      throw error;
    },
  );
  return defaultLocalePromise;
};

export async function proxy(request: NextRequest, event?: NextFetchEvent) {
  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = supportedLanguages.includes(segments[0] as SupportedLanguage) ? segments.slice(1) : segments;
  // This must run before locale/onboarding rewrites. Prepared HTML contains
  // viewer data; a URL is never an access token, including RSC/dotted paths.
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    /* Invalid paths remain inaccessible below. */
  }
  const decodedSegments = decodedPath.split("/").filter(Boolean);
  if (
    decodedSegments[0] === "prepared-board" ||
    (supportedLanguages.includes(decodedSegments[0] as SupportedLanguage) && decodedSegments[1] === "prepared-board")
  ) {
    const { isPreparationRequest } = await import("@homarr/cron-jobs/board-preparation");
    if ((request.method === "GET" || request.method === "HEAD") && isPreparationRequest(request)) {
      // Preparation warms the lookup/auth module graph as well as the HTML, so
      // the first visitor does not pay for evaluating those server imports.
      await import("./board-preparation/proxy");
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      return response;
    }
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const isOnboardingAccessRoute =
    (routeSegments.length === 1 && routeSegments[0] === "init") ||
    (routeSegments.length === 2 && routeSegments[0] === "auth" && routeSegments[1] === "login");

  if (!isOnboardingFinished && !isOnboardingAccessRoute) {
    const currentOnboardingStep = await getOnboardingStepDedupedAsync();
    if (currentOnboardingStep !== "finish") {
      return NextResponse.redirect(new URL("/init", request.url));
    }

    isOnboardingFinished = true;
  }

  // Only run this if the user has not already configured their language
  const currentLocale = request.cookies.get(localeCookieKey)?.value;
  let defaultLocale: SupportedLanguage = "en";
  if (!currentLocale || !supportedLanguages.includes(currentLocale as SupportedLanguage)) {
    const configuredLocale = await getDefaultLocaleDedupedAsync();
    if (supportedLanguages.includes(configuredLocale as SupportedLanguage)) {
      defaultLocale = configuredLocale as SupportedLanguage;
    }
  }

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");

  const next = createI18nMiddleware(defaultLocale);
  const response = next(request);
  if (!event) return response;
  const { getPreparedBoardResponseAsync } = await import("./board-preparation/proxy");
  const prepared = await getPreparedBoardResponseAsync(request, event, response);
  if (prepared) return prepared;
  return response;
}

export const config = {
  matcher: [
    "/prepared-board/:path*",
    "/:locale/prepared-board/:path*",
    "/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)",
  ],
};
