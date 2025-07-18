import { Redis } from "ioredis";
import superjson from "superjson";
import Transport from "winston-transport";

const messageSymbol = Symbol.for("message");
const levelSymbol = Symbol.for("level");

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class RedisTransport extends Transport {
  private redis: Redis | null = null;

  /**
   * Log the info to the Redis channel
   */
  log(info: { [messageSymbol]: string; [levelSymbol]: string }, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Is only initialized here because it did not work when initialized in the constructor or outside the class
    this.redis ??= new Redis();

    this.redis
      .publish(
        "pubSub:logging",
        superjson.stringify({
          message: info[messageSymbol],
          level: info[levelSymbol],
        }),
      )
      .then(() => {
        callback();
      })
      .catch(() => {
        // Ignore errors
      });
  }
}
