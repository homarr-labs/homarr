import type { RouterClient } from "@orpc/server";

import { appRouter } from "./root";

/** Canonical native oRPC router, shared by the worker and every frontend. */
export const orpcRouter = appRouter;
export type ORPCRouter = typeof orpcRouter;
export type ORPCClient = RouterClient<ORPCRouter>;
