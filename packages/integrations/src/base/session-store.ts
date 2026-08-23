import superjson from "superjson";

import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createGetSetChannel, getIntegrationSessionStoreKey } from "@homarr/redis";

const logger = createLogger({ module: "sessionStore" });

export const createSessionStore = <TValue>(integration: { id: string }) => {
  const channelName = getIntegrationSessionStoreKey(integration.id);
  const channel = createGetSetChannel<`${string}.${string}`>(channelName);

  return {
    async getAsync() {
      logger.debug("Getting session from store", { store: channelName });
      const value = await channel.getAsync();
      if (!value) return null;
      try {
        return superjson.parse<TValue>(decryptSecret(value));
      } catch (error) {
        logger.warn("Failed to load session", { store: channelName, error });
        return null;
      }
    },
    /**
     * @param value session to store
     * @param options pass `ttlSeconds` when the credential has a known lifetime, so a stored
     * session can never outlive the token it holds
     */
    async setAsync(value: TValue, options?: { ttlSeconds?: number }) {
      logger.debug("Updating session in store", { store: channelName, ttlSeconds: options?.ttlSeconds });
      try {
        await channel.setAsync(encryptSecret(superjson.stringify(value)), options);
      } catch (error) {
        logger.error(new ErrorWithMetadata("Failed to save session", { store: channelName }, { cause: error }));
      }
    },
    async clearAsync() {
      logger.debug("Cleared session in store", { store: channelName });
      await channel.removeAsync();
    },
  };
};

export type SessionStore<TValue> = ReturnType<typeof createSessionStore<TValue>>;
