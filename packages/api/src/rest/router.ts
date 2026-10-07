import { createTRPCRouter } from "../trpc";
import { createRestProcedure } from "./procedure";
import { restResponseSchema } from "./responses";
import { restRoutes } from "./routes";
import { restSources } from "./sources";

const parameterCount = (path: string) => [...path.matchAll(/\{[^}]+\}/g)].length;

export const restRouter = createTRPCRouter(
  Object.fromEntries(
    Object.entries(restSources)
      .toSorted(([left], [right]) => {
        const leftPath = restRoutes[left as keyof typeof restRoutes].path;
        const rightPath = restRoutes[right as keyof typeof restRoutes].path;
        return parameterCount(leftPath) - parameterCount(rightPath) || leftPath.localeCompare(rightPath);
      })
      .map(([name, source]) => {
        const route = restRoutes[name as keyof typeof restRoutes];
        const output = restResponseSchema(name);
        return [name.replaceAll(".", "_"), createRestProcedure(name, source, route, output)];
      }),
  ),
);
