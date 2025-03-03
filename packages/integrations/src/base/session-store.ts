import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { logger } from "@homarr/log";
import { createGetSetChannel } from "@homarr/redis";

const localLogger = logger.child({ module: "SessionStore" });

export const createSessionStore = (integration: { id: string }) => {
  const channelName = `session-store:${integration.id}`;
  const channel = createGetSetChannel<`${string}.${string}`>(channelName);

  return {
    async getAsync() {
      localLogger.debug("Getting session from store", { store: channelName });
      const value = await channel.getAsync();
      if (!value) return null;
      return decryptSecret(value);
    },
    async setAsync(value: string) {
      localLogger.debug("Updating session in store", { store: channelName });
      await channel.setAsync(encryptSecret(value));
    },
    async clearAsync() {
      localLogger.debug("Cleared session in store", { store: channelName });
      await channel.removeAsync();
    },
  };
};

export type SessionStore = ReturnType<typeof createSessionStore>;
