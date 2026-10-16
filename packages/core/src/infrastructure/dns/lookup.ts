import dns from "node:dns";
import type { LookupFunction } from "node:net";

export const lookupWithFallback: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, options, (error, address, family) => {
    if (error?.code !== "ENOTFOUND" || (options.family !== undefined && options.family !== 0)) {
      callback(error, address, family);
      return;
    }

    // Some resolvers return NXDOMAIN for AAAA despite a valid A record (or vice
    // versa), making a combined lookup fail. Keep native /etc/hosts handling and
    // retry each family independently without caching service addresses.
    void Promise.allSettled([
      dns.promises.lookup(hostname, { ...options, family: 4, all: true }),
      dns.promises.lookup(hostname, { ...options, family: 6, all: true }),
    ]).then((results) => {
      const order = options.order ?? dns.getDefaultResultOrder();
      if (order === "ipv6first" && (options.order !== undefined || options.verbatim !== false)) {
        results.reverse();
      }
      const addresses = results.flatMap((result) => {
        if (result.status === "fulfilled") return result.value;
        return [];
      });
      const first = addresses[0];
      if (!first) {
        callback(error, address, family);
        return;
      }
      if (options.all) {
        callback(null, addresses);
        return;
      }
      callback(null, first.address, first.family);
    });
  });
};
