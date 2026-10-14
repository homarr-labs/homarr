import { createRequestHandler, renderRouterToString, RouterServer } from "@tanstack/react-router/ssr/server";

import type { PreparedApplicationRenderer } from "@homarr/backend/host";
import { createRequestI18n } from "@homarr/translation/standalone";

import { AccessDeniedError, createAppRouter } from "../app/router";
import { createPublicProviderBinding } from "../app/public-providers";
import { bootstrapSchema, publicSettingsSchema } from "../contracts/render";
import type { RenderAssets } from "../contracts/render";

export async function renderPublicPage(
  context: Parameters<PreparedApplicationRenderer>[0],
  assets: RenderAssets,
  prepared: Parameters<PreparedApplicationRenderer>[1],
): Promise<Response> {
  if (!["GET", "HEAD"].includes(context.request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  context.signal.throwIfAborted();
  if (context.principal.kind !== "anonymous" || prepared.principal.kind !== "anonymous") {
    throw new Error("Private rendering is not joined");
  }
  const url = new URL(context.request.url);
  const origin = new URL(prepared.baseUrl).origin;
  let localePrefix = "";
  if (prepared.resolved.source === "explicit") {
    const firstSegment = url.pathname.split("/")[1];
    if (!firstSegment) throw new Error("Explicit locale path is missing");
    localePrefix = `/${firstSegment}`;
    if ((url.pathname.slice(localePrefix.length) || "/") !== prepared.routingPathname) {
      throw new Error("Prepared route does not match the document URL");
    }
  } else if (url.pathname !== prepared.routingPathname) {
    throw new Error("Prepared route does not match the document URL");
  }
  const publicSettings = publicSettingsSchema.parse(prepared.settings.serverSettings);
  const t = prepared.culture.i18n.getI18n("metadata");
  let explicitTheme: "light" | "dark" | undefined;
  if (prepared.colorScheme !== "auto") explicitTheme = prepared.colorScheme;
  const bootstrap = bootstrapSchema.parse({
    snapshot: {
      version: 1,
      requestId: context.requestId,
      locale: prepared.resolved.catalogLocale,
      theme: explicitTheme,
      direction: prepared.resolved.direction,
      renderRevision: prepared.revision,
      session: prepared.principal,
      setup: { kind: context.setup.kind },
    },
    assets,
    publicSettings,
    colorScheme: prepared.colorScheme,
    culture: {
      resolved: prepared.resolved,
      capturedClock: prepared.cultureSeed.capturedClock,
      preferences: prepared.culturePreferences,
      translation: {
        locale: prepared.culture.i18n.snapshot.locale,
        nowEpoch: prepared.cultureSeed.nowEpoch ?? prepared.cultureSeed.capturedClock,
        timeZone: prepared.culture.i18n.snapshot.timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone,
        formats: prepared.culture.i18n.snapshot.formats,
      },
    },
    routing: { origin, localePrefix },
    document: {
      description: t("description"),
      dashboardTitle: t("dashboardTitle", { appName: publicSettings.branding.appName }),
      websiteUrl: origin,
    },
  });
  const culture = {
    ...prepared.culture,
    i18n: createRequestI18n({
      ...prepared.culture.i18n.snapshot,
      now: new Date(bootstrap.culture.translation.nowEpoch),
      timeZone: bootstrap.culture.translation.timeZone,
      formats: bootstrap.culture.translation.formats,
    }),
  };
  const binding = createPublicProviderBinding(bootstrap, culture);
  const router = createAppRouter({ bootstrap, ...binding, authorize: (requirement) => context.authorize(requirement) });
  const queryClient = router.options.context.queryClient;
  context.onDispose(async () => {
    try {
      router.serverSsr?.cleanup();
    } finally {
      try {
        await queryClient.cancelQueries();
      } finally {
        queryClient.clear();
      }
    }
  });
  const response = await createRequestHandler({ request: context.request, createRouter: () => router })(
    async ({ responseHeaders }) => {
      const denial = router.stores.activeMatchesSnapshot.state.find(
        (match) => match.error instanceof AccessDeniedError,
      )?.error;
      if (denial instanceof AccessDeniedError) router.stores.statusCode.setState(() => denial.status);
      const redirect = router.stores.redirect.state;
      if (redirect) return new Response(null, { status: redirect.status, headers: responseHeaders });
      return renderRouterToString({ router, responseHeaders, children: <RouterServer router={router} /> });
    },
  );
  context.signal.throwIfAborted();
  return response;
}
