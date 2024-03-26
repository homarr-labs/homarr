import { Redis } from "ioredis";
import superjson from "superjson";
import Transport from "winston-transport";

const redis = new Redis();

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class RedisTransport extends Transport {
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

    redis
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
