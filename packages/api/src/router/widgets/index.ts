import type { AnyTRPCRouter } from "@trpc/server";
import { lazy } from "@trpc/server";

import { createTRPCRouter } from "../../trpc";
import { widgetRouterRegistry } from "./registry";
import type { WidgetRouterName } from "./registry";

const createLazyWidgetRouter = <TRouter extends AnyTRPCRouter>(loadRouter: () => Promise<TRouter>) => lazy(loadRouter);

const lazyWidgetRouters = Object.fromEntries(
  Object.entries(widgetRouterRegistry).map(([name, registration]) => [
    name,
    createLazyWidgetRouter(registration.loadRouter as () => Promise<AnyTRPCRouter>),
  ]),
) as unknown as {
  [TName in WidgetRouterName]: ReturnType<
    typeof createLazyWidgetRouter<
      (typeof widgetRouterRegistry)[TName] extends { loadRouter: () => Promise<infer TRouter> }
        ? TRouter extends AnyTRPCRouter
          ? TRouter
          : never
        : never
    >
  >;
};

export const widgetRouter = createTRPCRouter({
  ...lazyWidgetRouters,
  options: lazy(() => import("./options").then((mod) => mod.optionsRouter)),
});
