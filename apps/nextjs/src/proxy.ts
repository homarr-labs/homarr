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

export const config = {
  matcher: ["/((?!api|rpc|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
