import dayjs from "dayjs";
import type { Duration } from "dayjs/plugin/duration";

import type { Modify } from "@homarr/common/types";
import type { Integration, IntegrationSecret } from "@homarr/db/schema/sqlite";
import type { IntegrationKind } from "@homarr/definitions";
import { createIntegrationOptionsChannel } from "@homarr/redis";

type IntegrationOfKind<TKind extends IntegrationKind> = Omit<Integration, "kind"> & {
  kind: TKind;
  decryptedSecrets: Modify<Pick<IntegrationSecret, "kind" | "value">, { value: string }>[];
};

interface Options<TData, TKind extends IntegrationKind, TInput extends Record<string, unknown>> {
  // Unique key for this request handler
  queryKey: string;
  requestAsync: (integration: IntegrationOfKind<TKind>, input: TInput) => Promise<TData>;
  cacheDuration: Duration;
}

export const createCachedRequestHandler = <
  TData,
  TKind extends IntegrationKind,
  TInput extends Record<string, unknown>,
>(
  options: Options<TData, TKind, TInput>,
) => {
  const createCacheChannel = (integrationId: string, input: TInput) => {
    return createIntegrationOptionsChannel<TData>(integrationId, options.queryKey, input);
  };

  return {
    createCacheChannel,
    handler: (integrationId: string, input: TInput) => {
      const channel = createCacheChannel(integrationId, input);

      return {
        async getCachedOrUpdatedDataAsync(integration: IntegrationOfKind<TKind>, { forceUpdate = false }) {
          const channelData = await channel.getAsync();

          const shouldRequestNewData =
            forceUpdate ||
            !channelData ||
            dayjs().diff(channelData.timestamp, "milliseconds") > options.cacheDuration.asMilliseconds();

          if (shouldRequestNewData) {
            const data = await options.requestAsync(integration, input);
            await channel.publishAndUpdateLastStateAsync(data);
            return data;
          }

          return channelData.data;
        },
        subscribe(callback: (data: TData) => void) {
          return channel.subscribe(callback);
        },
      };
    },
  };
};
