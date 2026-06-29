import { clientApi } from "@homarr/api/client";

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
    const options = queryResults.flatMap((queryResult) => queryResult.data ?? []);

    const uniqueOptions = [...new Map(options.map((option) => [option.value, option])).values()];

    return {
      data: uniqueOptions,
      isPending,
      isError: isError && uniqueOptions.length === 0,
    };
  },
});
