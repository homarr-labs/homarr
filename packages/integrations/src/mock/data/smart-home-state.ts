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

let commandClient: RedisClient | undefined;
let subscriber: RedisClient | undefined;

const createClient = () =>
  createRedisClient({
    connectTimeout: 1000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1,
  });

const getClient = () => {
  commandClient ??= createClient();
  return commandClient;
};

const getSubscriber = () => {
  subscriber ??= createClient();
  return subscriber;
};

// Controls and streaming runtimes share state through the configured state backend.
export const createSmartHomeMockState = (integrationId: string): SmartHomeMockState => {
  const key = `mock:smart-home:v1:${integrationId}`;
  const channel = `${key}:changed`;

  return {
    async readAsync(entityIds) {
      if (entityIds.length === 0) return [];
      const values = await getClient().hmget(key, ...entityIds);
      return values.flatMap((value) => {
        if (!value) return [];
        return [JSON.parse(value) as SmartHomeMockStateEntry];
      });
    },
    async updateAsync(entity, update) {
      const client = getClient();
      // Bound contention to five CAS attempts; the caller can retry the action after exhaustion.
      for (let attempt = 0; attempt < 5; attempt++) {
        const [previous] = await client.hmget(key, entity.id);
        let current = { entity, revision: 0 };
        if (previous) current = JSON.parse(previous) as SmartHomeMockStateEntry;
        const updated = update(current.entity);
        if (updated === current.entity) return current;
        const entry = { entity: updated, revision: current.revision + 1 };
        const stored = await client.compareAndSwapHashAsync(
          key,
          entity.id,
          previous ?? "",
          JSON.stringify(entry),
          86_400_000,
          channel,
        );
        if (stored) return entry;
      }
      throw new Error("The mock entity changed during the action; retry the action");
    },
    async subscribeAsync(onChange) {
      const subscription = getSubscriber().subscribeChannel(channel, (message) =>
        onChange(JSON.parse(message) as SmartHomeMockStateEntry),
      );
      try {
        await subscription.ready;
      } catch (error) {
        subscription.unsubscribe();
        throw error;
      }
      return subscription.unsubscribe;
    },
  };
};
