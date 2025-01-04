import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createTRPCClient, httpLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "@homarr/api";
import { createHeadersCallbackForSource } from "@homarr/api/shared";
import { createI18nMiddleware } from "@homarr/translation/middleware";

export async function middleware(request: NextRequest) {
  // fetch api does not work because window is not defined and we need to construct the url from the headers
  // In next 15 we will be able to use node apis and such the db directly
  const culture = await serverFetchApi.serverSettings.getCulture.query();

  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;
  if (!pathname.endsWith("/init")) {
    const currentOnboardingStep = await serverFetchApi.onboard.currentStep.query();
    if (currentOnboardingStep.current !== "finish") {
      return NextResponse.redirect(new URL("/init", request.url));
    }
  }

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");
  const next = createI18nMiddleware(culture.defaultLocale);
  return next(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};

export const serverFetchApi = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `http://${process.env.HOSTNAME ?? "localhost"}:3000/api/trpc`,
      transformer: SuperJSON,
      headers: createHeadersCallbackForSource("server-fetch"),
    }),
  ],
});
