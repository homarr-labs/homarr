import dayjs from "dayjs";
import type { Duration } from "dayjs/plugin/duration";

import type { createChannelWithLatestAndEvents } from "@homarr/redis";

interface Options<TData, TInput extends Record<string, unknown>> {
  // Unique key for this request handler
  queryKey: string;
  requestAsync: (input: TInput) => Promise<TData>;
  createRedisChannel: (
    input: TInput,
    options: Options<TData, TInput>,
  ) => ReturnType<typeof createChannelWithLatestAndEvents<TData>>;
  cacheDuration: Duration;
}

export const createCachedRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  return {
    handler: (input: TInput) => {
      const channel = options.createRedisChannel(input, options);

      return {
        async getCachedOrUpdatedDataAsync({ forceUpdate = false }) {
          const channelData = await channel.getAsync();

          const shouldRequestNewData =
            forceUpdate ||
            !channelData ||
            dayjs().diff(channelData.timestamp, "milliseconds") > options.cacheDuration.asMilliseconds();

          if (shouldRequestNewData) {
            const data = await options.requestAsync(input);
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
