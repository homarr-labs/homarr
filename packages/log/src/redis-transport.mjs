import { Redis } from "ioredis";
import Transport from "winston-transport";
import superjson from 'superjson';

const redis = new Redis();

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
export class RedisTransport extends Transport {
  constructor(opts) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super(opts);

    // Consume any custom options here. e.g.:
    // - Connection information for databases
    // - Authentication information for APIs (e.g. loggly, papertrail,
    //   logentries, etc.).
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // console.log(JSON.stringify(info));

    redis
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      .publish("logging", superjson.stringify({ message: info.message, timestamp: info.timestamp, level: info.level }))
      .then(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        callback();
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
  }
}
