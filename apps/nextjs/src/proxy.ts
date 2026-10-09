import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getDefaultLocaleForProxyAsync, getOnboardingStepForProxyAsync } from "@homarr/db/proxy-reader";
import { localeCookieKey } from "@homarr/definitions/cookie";
import type { SupportedLanguage } from "@homarr/translation/languages";
import { supportedLanguages } from "@homarr/translation/languages";
import { createI18nMiddleware } from "@homarr/translation/middleware";
import { env } from "~/env";

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

export async function proxy(request: NextRequest) {
  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = supportedLanguages.includes(segments[0] as SupportedLanguage) ? segments.slice(1) : segments;
  if (routeSegments[0] === "debug" && routeSegments[1] === "board" && !env.ENABLE_BOARD_DEBUG)
    return new NextResponse("Not found", { status: 404 });
  if (routeSegments.join("/") === "debug/board/preview") {
    const response = NextResponse.next();
    const origin = request.nextUrl.origin;
    const websocketOrigin = origin.replace(/^http/, "ws");
    // Next.js loads its own chunks and development transport here. Widget API
    // calls, remote images, media and nested frames remain blocked by the CSP.
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src ${origin}/_next/ ${websocketOrigin}/_next/; frame-src 'none'; media-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'`,
    );
    return response;
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
  return next(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
