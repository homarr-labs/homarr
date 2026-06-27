import dayjs from "dayjs";
import type { Duration } from "dayjs/plugin/duration";

import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { createChannelWithLatestAndEvents } from "@homarr/redis";

const logger = createLogger({ module: "cachedRequestHandler" });

type FetchResult<TData> = { data: TData; timestamp: Date };
type InFlightEntry = Promise<FetchResult<unknown>>;

const inFlightFetches = new Map<string, InFlightEntry>();

const isAbortedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
};

interface Options<TData, TInput extends Record<string, unknown>> {
  // Unique key for this request handler
  queryKey: string;
  requestAsync: (input: TInput) => Promise<TData>;
  createRedisChannel: (
    input: TInput,
    options: Options<TData, TInput>,
  ) => ReturnType<typeof createChannelWithLatestAndEvents<TData>>;
  cacheDuration: Duration;
  fallbackToStaleOnError?: boolean;
  // Retry the upstream call on failure. attempts=1 means no retry (default).
  // AbortError / TimeoutError are never retried.
  retry?: { attempts?: number; delayMs?: number };
  // Predicate to decide whether a fetched response is worth caching.
  // Return false to skip the cache write (next call will refetch).
  isValid?: (data: TData) => boolean;
}

const defaultRetry = { attempts: 1, delayMs: 0 };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const createCachedRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  return {
    handler: (input: TInput) => {
      const channel = options.createRedisChannel(input, options);
      const retryConfig = { ...defaultRetry, ...options.retry };

      return {
        async getCachedOrUpdatedDataAsync({ forceUpdate = false }) {
          const channelData = await channel.getAsync();

          const requestNewDataAsync = (): Promise<FetchResult<TData>> => {
            const inflight = inFlightFetches.get(channel.name);
            if (inflight) {
              logger.debug("Cached request handler joining in-flight fetch", {
                channel: channel.name,
                queryKey: options.queryKey,
              });
              return inflight as Promise<FetchResult<TData>>;
            }

            const promise = (async (): Promise<FetchResult<TData>> => {
              let lastError: unknown;
              for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
                try {
                  const data = await options.requestAsync(input);
                  if (options.isValid && !options.isValid(data)) {
                    logger.warn("Cached request handler received invalid data, not caching", {
                      channel: channel.name,
                      queryKey: options.queryKey,
                      attempt,
                    });
                    return { data, timestamp: new Date() };
                  }
                  await channel.publishAndUpdateLastStateAsync(data);
                  return { data, timestamp: new Date() };
                } catch (error) {
                  lastError = error;
                  if (isAbortedError(error) || attempt === retryConfig.attempts) {
                    break;
                  }
                  logger.warn("Cached request handler fetch failed, retrying", {
                    channel: channel.name,
                    queryKey: options.queryKey,
                    attempt,
                    nextDelayMs: retryConfig.delayMs,
                    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
                  });
                  await sleep(retryConfig.delayMs);
                }
              }

              if (options.fallbackToStaleOnError && channelData) {
                logger.warn(
                  new ErrorWithMetadata(
                    "Cached request handler using stale cache after fetch failure",
                    {
                      channel: channel.name,
                      queryKey: options.queryKey,
                      attempts: retryConfig.attempts,
                    },
                    { cause: lastError },
                  ),
                );
                return channelData;
              }

              throw lastError;
            })().finally(() => {
              inFlightFetches.delete(channel.name);
            });

            inFlightFetches.set(channel.name, promise as InFlightEntry);
            return promise;
          };

          if (forceUpdate) {
            logger.debug("Cached request handler forced update", {
              channel: channel.name,
              queryKey: options.queryKey,
            });
            return await requestNewDataAsync();
          }

          const shouldRequestNewData =
            !channelData ||
            dayjs().diff(channelData.timestamp, "milliseconds") > options.cacheDuration.asMilliseconds();

          if (shouldRequestNewData) {
            logger.debug("Cached request handler cache miss", {
              channel: channel.name,
              queryKey: options.queryKey,
              reason: !channelData ? "no data" : "cache expired",
            });
            return await requestNewDataAsync();
          }

          logger.debug("Cached request handler cache hit", {
            channel: channel.name,
            queryKey: options.queryKey,
            expiresAt: dayjs(channelData.timestamp).add(options.cacheDuration).toISOString(),
          });

          return channelData;
        },
        async invalidateAsync() {
          logger.debug("Cached request handler invalidating cache", {
            channel: channel.name,
            queryKey: options.queryKey,
          });
          await this.getCachedOrUpdatedDataAsync({ forceUpdate: true });
        },
        subscribe(callback: (data: TData) => void) {
          return channel.subscribe(callback);
        },
      };
    },
  };
};
