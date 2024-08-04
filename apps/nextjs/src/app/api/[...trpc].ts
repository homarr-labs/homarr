import { createOpenApiFetchHandler } from "trpc-swagger";

import { appRouter, createTRPCContext } from "@homarr/api";

const handler = (req: Request) => {
  return createOpenApiFetchHandler({
    req,
    endpoint: "/api",
    router: appRouter,
    // createContext: () => { return {} },
    createContext: createTRPCContext,
  });
};
export { handler as GET, handler as POST };
