import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

import type { SmartHomeEntity } from "../../interfaces/smart-home/smart-home-types";

export interface SmartHomeMockStateEntry {
  entity: SmartHomeEntity;
  revision: number;
}

export interface SmartHomeMockState {
  readAsync(entityIds: string[]): Promise<SmartHomeMockStateEntry[]>;
  updateAsync(
    entity: SmartHomeEntity,
    update: (current: SmartHomeEntity) => SmartHomeEntity,
  ): Promise<SmartHomeMockStateEntry>;
  subscribeAsync(onChange: (entry: SmartHomeMockStateEntry) => void): Promise<() => void>;
}

let clientPromise: Promise<RedisClient> | undefined;

const getClientAsync = async () => {
  if (!clientPromise) {
    const client = createRedisClient({
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    clientPromise = client
      .connect()
      .then(() => client)
      .catch((error: unknown) => {
        client.disconnect();
        clientPromise = undefined;
        throw error;
      });
  }
  return await clientPromise;
};

// Keep each entity update atomic so a live media tick cannot overwrite a control.
const updateScript = `
  local previous = redis.call('hget', KEYS[1], ARGV[1]) or ''
  if previous ~= ARGV[2] then return 0 end
  redis.call('hset', KEYS[1], ARGV[1], ARGV[3])
  redis.call('expire', KEYS[1], 86400)
  redis.call('publish', KEYS[2], ARGV[3])
  return 1
`;

export const createSmartHomeMockState = (integrationId: string): SmartHomeMockState => {
  const key = `mock:smart-home:v1:${integrationId}`;
  const channel = `${key}:changed`;

  return {
    async readAsync(entityIds) {
      if (entityIds.length === 0) return [];
      const values = await (await getClientAsync()).hmget(key, ...entityIds);
      return values.flatMap((value) => {
        if (!value) return [];
        return [JSON.parse(value) as SmartHomeMockStateEntry];
      });
    },
    async updateAsync(entity, update) {
      const client = await getClientAsync();
      for (let attempt = 0; attempt < 5; attempt++) {
        const previous = await client.hget(key, entity.id);
        let current = { entity, revision: 0 };
        if (previous) current = JSON.parse(previous) as SmartHomeMockStateEntry;
        const updated = update(current.entity);
        if (updated === current.entity) return current;
        const entry = { entity: updated, revision: current.revision + 1 };
        const stored = await client.eval(
          updateScript,
          2,
          key,
          channel,
          entity.id,
          previous ?? "",
          JSON.stringify(entry),
        );
        if (stored === 1) return entry;
      }
      throw new Error("The mock entity changed during the action; retry the action");
    },
    async subscribeAsync(onChange) {
      const subscriber = (await getClientAsync()).duplicate({ lazyConnect: true });
      subscriber.on("message", (_channel, message) => onChange(JSON.parse(message) as SmartHomeMockStateEntry));
      try {
        await subscriber.connect();
        await subscriber.subscribe(channel);
      } catch (error) {
        subscriber.disconnect();
        throw error;
      }
      return () => subscriber.disconnect();
    },
  };
};
