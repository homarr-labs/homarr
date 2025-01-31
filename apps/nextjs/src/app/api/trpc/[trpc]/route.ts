import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@homarr/api";
import { trpcPath } from "@homarr/api/shared";
import { auth } from "@homarr/auth/next";
import { logger } from "@homarr/log";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
function setCorsHeaders(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
}

export function OPTIONS() {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
}

const handler = auth(async (req) => {
  const response = await fetchRequestHandler({
    endpoint: trpcPath,
    router: appRouter,
    req,
    createContext: () => createTRPCContext({ session: req.auth, headers: req.headers }),
    onError({ error, path, type }) {
      logger.error(
        `tRPC Error with ${type} on '${path}': (${error.code}) - ${error.message}\n${error.stack}\n${error.cause}`,
      );
    },
  });

  setCorsHeaders(response);
  return response;
});

export { handler as GET, handler as POST };
