import { clientApi } from "@homarr/api/client";

import { toScopedStorageVolumeValue } from "./filter-storage-volumes";

export const createStorageVolumeMultiSelectOptions = () => ({
  defaultValue: [] as string[],
  withDescription: true,
  useOptions: (integrationIds: string[]) => {
    const queryResults = clientApi.useQueries((queryBuilder) =>
      integrationIds.map((integrationId) =>
        queryBuilder.widget.healthMonitoring.listStorageVolumes({
          integrationId,
        }),
      ),
    );

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
