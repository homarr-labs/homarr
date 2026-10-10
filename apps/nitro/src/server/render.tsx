import { createRequestHandler, renderRouterToString, RouterServer } from "@tanstack/react-router/ssr/server";

import { AccessDeniedError, createAppRouter } from "../app/router";
import type { ProviderContributions } from "../contracts/providers";
import { bootstrapSchema } from "../contracts/render";
import type { PublicRenderSettings, RenderAssets } from "../contracts/render";
import type { RequestContext } from "../contracts/request";

export async function renderPublicPage(
  context: RequestContext,
  assets: RenderAssets,
  providers: ProviderContributions = {},
  settings: PublicRenderSettings = { locale: "en", theme: "light", direction: "ltr", renderRevision: "foundation-1" },
): Promise<Response> {
  if (!["GET", "HEAD"].includes(context.request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const bootstrap = bootstrapSchema.parse({
    snapshot: {
      version: 1,
      requestId: context.requestId,
      locale: settings.locale,
      theme: settings.theme,
      direction: settings.direction,
      renderRevision: settings.renderRevision,
      session: { kind: context.principal.kind },
      setup: { kind: context.setup.kind },
    },
    assets,
  });
  const router = createAppRouter({ bootstrap, providers, authorize: (requirement) => context.authorize(requirement) });
  const queryClient = router.options.context.queryClient;
  context.onDispose(async () => {
    router.serverSsr?.cleanup();
    await queryClient.cancelQueries();
    queryClient.clear();
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
  return response;
}
