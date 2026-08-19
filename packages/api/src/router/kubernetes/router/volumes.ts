import { TRPCError } from "@trpc/server";

import type { KubernetesVolume } from "@homarr/definitions";

import { kubernetesMiddleware } from "../../../middlewares/kubernetes";
import { createTRPCRouter, permissionRequiredProcedure } from "../../../trpc";
import { getKubernetesClient, kubernetesContextInput } from "../kubernetes-context";

export const volumesRouter = createTRPCRouter({
  getVolumes: permissionRequiredProcedure
    .requiresPermission("admin")
    .concat(kubernetesMiddleware())
    .input(kubernetesContextInput)
    .query(async ({ input }): Promise<KubernetesVolume[]> => {
      const { coreApi } = getKubernetesClient(input.contextId);

      try {
        const volumes = await coreApi.listPersistentVolumeClaimForAllNamespaces();

        return volumes.items.map((volume) => {
          return {
            name: volume.metadata?.name ?? "unknown",
            namespace: volume.metadata?.namespace ?? "unknown",
            accessModes: volume.status?.accessModes?.map((accessMode) => accessMode) ?? [],
            storage: volume.status?.capacity?.storage ?? "",
            storageClassName: volume.spec?.storageClassName ?? "",
            volumeMode: volume.spec?.volumeMode ?? "",
            volumeName: volume.spec?.volumeName ?? "",
            status: volume.status?.phase ?? "",
            creationTimestamp: volume.metadata?.creationTimestamp,
          };
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching Kubernetes Volumes",
          cause: error,
        });
      }
    }),
});
