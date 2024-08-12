import { createOpenApiFetchHandler } from "trpc-swagger/build/index.mjs";

import { appRouter, createTRPCContext } from "@homarr/api";

// Application Component || Define Handler
// =================================================================================================
// =================================================================================================
const handler = (req: Request) => {
  // Handle incoming swagger/openapi requests
  return createOpenApiFetchHandler({
    req,
    endpoint: "/api",
    router: appRouter,
    // createContext: () => { return {} },
    createContext: () => createTRPCContext({ session: null, headers: req.headers }),
  });
};
// Application Component || Define Exports
// =================================================================================================
// =================================================================================================
export { handler as GET, handler as POST };
