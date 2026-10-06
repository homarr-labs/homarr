import { cache } from "react";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { appRouter, createCaller } from "@homarr/api";

import { createRscTrpcContext } from "./rsc-context";
import { makeQueryClient } from "./shared";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = () => createRscTrpcContext();

export const api = createCaller(createContext);

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: getQueryClient,
});
