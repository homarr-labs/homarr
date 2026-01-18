import { lazy } from "@trpc/server";

import { createTRPCRouter } from "../../../trpc";

export const kubernetesRouter = createTRPCRouter({
  nodes: lazy(() => import("./nodes").then((mod) => mod.nodesRouter)),
  cluster: lazy(() => import("./cluster").then((mod) => mod.clusterRouter)),
  namespaces: lazy(() => import("./namespaces").then((mod) => mod.namespacesRouter)),
  ingresses: lazy(() => import("./ingresses").then((mod) => mod.ingressesRouter)),
  services: lazy(() => import("./services").then((mod) => mod.servicesRouter)),
  pods: lazy(() => import("./pods").then((mod) => mod.podsRouter)),
  secrets: lazy(() => import("./secrets").then((mod) => mod.secretsRouter)),
  configMaps: lazy(() => import("./configMaps").then((mod) => mod.configMapsRouter)),
  volumes: lazy(() => import("./volumes").then((mod) => mod.volumesRouter)),
});
