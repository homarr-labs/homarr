import { createOpenApiFetchHandler } from "trpc-swagger/build/index.mjs";

import { appRouter, createTRPCContext } from "@homarr/api";

const handler = (req: Request) => {
  return createOpenApiFetchHandler({
    req,
    endpoint: "/",
    router: appRouter,
    createContext: () => createTRPCContext({ session: null, headers: req.headers }),
  });
};

export { handler as GET, handler as POST };
