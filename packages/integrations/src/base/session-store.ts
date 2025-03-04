import superjson from "superjson";

import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { logger } from "@homarr/log";
import { createGetSetChannel } from "@homarr/redis";

const localLogger = logger.child({ module: "SessionStore" });

export const createSessionStore = <TValue>(integration: { id: string }) => {
  const channelName = `session-store:${integration.id}`;
  const channel = createGetSetChannel<`${string}.${string}`>(channelName);

  return {
    async getAsync() {
      localLogger.debug("Getting session from store", { store: channelName });
      const value = await channel.getAsync();
      if (!value) return null;
      try {
        return superjson.parse<TValue>(decryptSecret(value));
      } catch (error) {
        localLogger.warn("Failed to load session", { store: channelName, error });
        return null;
      }
    },
    async setAsync(value: TValue) {
      localLogger.debug("Updating session in store", { store: channelName });
      try {
        await channel.setAsync(encryptSecret(superjson.stringify(value)));
      } catch (error) {
        localLogger.error("Failed to save session", { store: channelName, error });
      }
    },
    async clearAsync() {
      localLogger.debug("Cleared session in store", { store: channelName });
      await channel.removeAsync();
    },
  };
};

export type SessionStore<TValue> = ReturnType<typeof createSessionStore<TValue>>;
