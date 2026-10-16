/** Optional transition transport for the existing Next dashboard. */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createLegacyApiRouter } from "@homarr/api/legacy";
import { orpcRouter } from "@homarr/api/orpc";

import { createBackendContextAsync, isRpcOriginAllowed } from "../context";

const router = createLegacyApiRouter(orpcRouter);

export async function handleLegacyRpcAsync(request: Request): Promise<Response> {
  const auth = await createBackendContextAsync(request);
  if (!isRpcOriginAllowed(request, auth.authenticatedWithApiKey)) {
    return Response.json(
      { message: "This origin is not allowed to make authenticated RPC requests." },
      { status: 403 },
    );
  }
  return await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router,
    createContext: () => auth.context,
  });
}
