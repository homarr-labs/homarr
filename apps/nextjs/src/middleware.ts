import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "@homarr/api";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { SupportedLanguage } from "@homarr/translation";
import { createI18nMiddleware } from "@homarr/translation/middleware";

// Simple in-memory cache for onboarding status (makes it only request once and keep result in memory)
const onboardingStatusCache = new Map<string, string>();
const cultureCache = new Map<string, { defaultLocale: string }>();

export async function middleware(request: NextRequest) {
  const csrfToken = request.cookies.get("authjs.csrf-token")?.value;

  // fetch api does not work because window is not defined and we need to construct the url from the headers
  // In next 15 we will be able to use node apis and such the db directly
  let culture;
  if (csrfToken && cultureCache.has(csrfToken)) {
    culture = cultureCache.get(csrfToken);
  } else {
    culture = await serverFetchApi.serverSettings.getCulture.query();
    if (csrfToken) {
      cultureCache.set(csrfToken, culture);
    }
  }

  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;
  if (!pathname.endsWith("/init")) {
    let currentStep;

    if (csrfToken && onboardingStatusCache.has(csrfToken)) {
      // Use cached value if available
      currentStep = { current: onboardingStatusCache.get(csrfToken) };
    } else {
      // Cache miss, fetch from API
      const currentOnboardingStep = await serverFetchApi.onboard.currentStep.query();

      // Store in cache
      if (csrfToken) {
        onboardingStatusCache.set(csrfToken, currentOnboardingStep.current);
      }
      currentStep = currentOnboardingStep;
    }

    if (currentStep.current !== "finish") {
      return NextResponse.redirect(new URL("/init", request.url));
    }
  }

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");
  const next = createI18nMiddleware(culture?.defaultLocale as SupportedLanguage);
  return next(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};

export const serverFetchApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: SuperJSON,
      headers: createHeadersCallbackForSource("server-fetch"),
    }),
  ],
});
