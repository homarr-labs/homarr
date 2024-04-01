import { Redis } from "ioredis";
import superjson from "superjson";
import Transport from "winston-transport";

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class RedisTransport extends Transport {
  /** @type {Redis} */
  redis;

  /**
   * Constructor
   * @param {Transport.TransportStreamOptions | undefined} opts
   */
  constructor(opts) {
    super(opts);

    // Consume any custom options here. e.g.:
    // - Connection information for databases
    // - Authentication information for APIs (e.g. loggly, papertrail,
    //   logentries, etc.).
  }

  /**
   * Log the info to the Redis channel
   * @param {{ message: string; timestamp: string; level: string; }} info
   * @param {() => void} callback
   */
  log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    if (!this.redis) {
      // Is only initialized here because it did not work when initialized in the constructor or outside the class
      this.redis = new Redis();
    }

    this.redis
      .publish(
        "logging",
        superjson.stringify({
          message: info.message,
          timestamp: info.timestamp,
          level: info.level,
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
