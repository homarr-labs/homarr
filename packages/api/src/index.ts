import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import { createCallerFactory, createApiContext } from "./procedure";

/** Native server-side client; every call runs input validation and authorization. */
const createCaller = createCallerFactory(appRouter);
type RouterInputs = InferRouterInputs<AppRouter>;
type RouterOutputs = InferRouterOutputs<AppRouter>;

export { createApiContext, appRouter, createCaller };
export type { ApiContext } from "./procedure";
export type { AppRouter, RouterInputs, RouterOutputs };
