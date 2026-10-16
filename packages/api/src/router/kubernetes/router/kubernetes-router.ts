import { createLazyRouter } from "../../../procedure";

import { createApiRouter } from "../../../procedure";

export const kubernetesRouter = createApiRouter({
  contexts: createLazyRouter(() => import("./contexts").then((mod) => mod.contextsRouter)),
  nodes: createLazyRouter(() => import("./nodes").then((mod) => mod.nodesRouter)),
  cluster: createLazyRouter(() => import("./cluster").then((mod) => mod.clusterRouter)),
  namespaces: createLazyRouter(() => import("./namespaces").then((mod) => mod.namespacesRouter)),
  ingresses: createLazyRouter(() => import("./ingresses").then((mod) => mod.ingressesRouter)),
  services: createLazyRouter(() => import("./services").then((mod) => mod.servicesRouter)),
  pods: createLazyRouter(() => import("./pods").then((mod) => mod.podsRouter)),
  secrets: createLazyRouter(() => import("./secrets").then((mod) => mod.secretsRouter)),
  configMaps: createLazyRouter(() => import("./configMaps").then((mod) => mod.configMapsRouter)),
  volumes: createLazyRouter(() => import("./volumes").then((mod) => mod.volumesRouter)),
});
