import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@homarr/auth/next";

import { createTRPCContext } from "./trpc";

export const createRscTrpcContext = cache(async () => {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "rsc");

  return createTRPCContext({
    session: await auth(),
    headers: requestHeaders,
  });
});
