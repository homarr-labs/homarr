import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "requestHandler" });

const isAbortedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
};

interface Options<TData, TInput extends Record<string, unknown>> {
  queryKey: string;
  requestAsync: (input: TInput) => Promise<TData>;
  retry?: { attempts?: number; delayMs?: number };
  isValid?: (data: TData) => boolean;
}

const defaultRetry = { attempts: 1, delayMs: 0 };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const createRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  return {
    handler: (input: TInput) => {
      const retryConfig = { ...defaultRetry, ...options.retry };

      return {
        async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
          let lastError: unknown;
          for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
            try {
              const data = await options.requestAsync(input);
              if (options.isValid && !options.isValid(data)) {
                logger.warn("Request handler received invalid data", {
                  queryKey: options.queryKey,
                  attempt,
                });
              }
              return { data, timestamp: new Date() };
            } catch (error) {
              lastError = error;
              if (isAbortedError(error) || attempt === retryConfig.attempts) {
                throw error;
              }
              logger.warn("Request handler fetch failed, retrying", {
                queryKey: options.queryKey,
                attempt,
                nextDelayMs: retryConfig.delayMs,
                error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
              });
              await sleep(retryConfig.delayMs);
            }
          }
          throw lastError;
        },
      };
    },
  };
};
