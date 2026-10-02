import { randomUUID } from "node:crypto";
import { stringify } from "superjson";
import Transport from "winston-transport";

import type { RedisClient } from "../../redis/client";
import { createRedisClient } from "../../redis/client";
import type { LoggerMessage } from "../constants";
import { LOG_HISTORY_KEY, LOG_HISTORY_MAX_ENTRIES, LOG_PUBLISH_CHANNEL } from "../constants";

const messageSymbol = Symbol.for("message");
const levelSymbol = Symbol.for("level");

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class RedisTransport extends Transport {
  private redis: RedisClient | null = null;

  /**
   * Retain the log in a bounded Redis list and publish it to live subscribers.
   */
  log(info: { [messageSymbol]: string; [levelSymbol]: LoggerMessage["level"] }, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const message: LoggerMessage = {
      id: randomUUID(),
      timestamp: new Date(),
      message: info[messageSymbol],
      level: info[levelSymbol],
    };
    const serializedMessage = stringify(message);

    callback();

    void Promise.resolve()
      .then(() => {
        // Is only initialized here because it did not work when initialized in the constructor or outside the class
        if (!this.redis) {
          this.redis = createRedisClient();
          this.redis.options.maxRetriesPerRequest = 1;
          this.redis.on("error", () => undefined);
        }

        return this.redis
          .multi()
          .lpush(LOG_HISTORY_KEY, serializedMessage)
          .ltrim(LOG_HISTORY_KEY, 0, LOG_HISTORY_MAX_ENTRIES - 1)
          .publish(LOG_PUBLISH_CHANNEL, serializedMessage)
          .exec();
      })
      .catch(() => undefined);
  }
}
