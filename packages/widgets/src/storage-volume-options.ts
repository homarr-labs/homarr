import type { NativeWidgetOutputs } from "@homarr/api/nitro/browser-contracts/widgets";

import { toScopedStorageVolumeValue } from "./filter-storage-volumes";

export interface StorageVolumeObservation {
  data: NativeWidgetOutputs["healthMonitoring"]["listStorageVolumes"] | undefined;
  isPending: boolean;
  isError: boolean;
}

export type StorageVolumeObservationHook = (integrationIds: string[]) => readonly StorageVolumeObservation[];

export const createStorageVolumeMultiSelectOptions = (useStorageVolumeObservations: StorageVolumeObservationHook) => ({
  defaultValue: [] as string[],
  withDescription: true,
  useOptions: (integrationIds: string[]) => {
    const queryResults = useStorageVolumeObservations(integrationIds);

    const isPending = queryResults.some((queryResult) => queryResult.isPending);
    const isError = queryResults.every((queryResult) => queryResult.isError);
    const options = queryResults.flatMap((queryResult, index) => {
      const integrationId = integrationIds[index];
      if (!integrationId) {
        return [];
      }

      return (queryResult.data ?? []).map((option) => ({
        label: option.label,
        value: toScopedStorageVolumeValue(integrationId, option.value),
      }));
    });

    const uniqueOptions = [...new Map(options.map((option) => [option.value, option])).values()];

    return {
      data: uniqueOptions,
      isPending,
      isError: isError && uniqueOptions.length === 0,
    };
  },
});
