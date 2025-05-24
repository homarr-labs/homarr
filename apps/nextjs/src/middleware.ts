import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "@homarr/api";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { localeCookieKey } from "@homarr/definitions";
import type { SupportedLanguage } from "@homarr/translation";
import { supportedLanguages } from "@homarr/translation";
import { createI18nMiddleware } from "@homarr/translation/middleware";

let isOnboardingFinished = false;

export async function middleware(request: NextRequest) {
  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;

  if (!isOnboardingFinished && !pathname.endsWith("/init")) {
    const currentOnboardingStep = await serverFetchApi.onboard.currentStep.query();
    if (currentOnboardingStep.current !== "finish") {
      return NextResponse.redirect(new URL("/init", request.url));
    }

    isOnboardingFinished = true;
  }

  // Only run this if the user has not already configured their language
  const currentLocale = request.cookies.get(localeCookieKey)?.value;
  let defaultLocale: SupportedLanguage = "en";
  if (!currentLocale || !supportedLanguages.includes(currentLocale as SupportedLanguage)) {
    defaultLocale = await serverFetchApi.serverSettings.getCulture.query().then((culture) => culture.defaultLocale);
  }

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");
  const next = createI18nMiddleware(defaultLocale);
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
