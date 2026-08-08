import type { NextRequest } from "next/server";
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

export async function proxy(request: NextRequest) {
  // Redirect to onboarding if it's not finished yet
  const pathname = request.nextUrl.pathname;

  if (!isOnboardingFinished && !pathname.endsWith("/init")) {
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
