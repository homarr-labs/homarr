import { command, string } from "@drizzle-team/brocli";

import "@homarr/common/init-dns";

global.homarr.dnsCacheManager?.initialize();

export const dnsHostnameTest = command({
  name: "dns-hostname-test",
  desc: "Try out if dns-caching for hostnames is working",
  options: {
    hostname: string("hostname").required().alias("ho").desc("Hostname to call for action"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async ({ hostname }) => {
    let request = 1;
    try {
      const initialEntries = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`Initial DNS Cache Entries: ${JSON.stringify(initialEntries)}`);
      const entry = await global.homarr.dnsCacheManager?.lookup(hostname);
      console.log(`Received first response hostname=${hostname} entry=${JSON.stringify(entry)}`);
      const entriesAfterOne = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`DNS Cache Entries after first request: ${JSON.stringify(entriesAfterOne)}`);

      await sleep(1000);

      request++;
      const entry2 = await global.homarr.dnsCacheManager?.lookup(hostname);
      console.log(`Received second response hostname=${hostname} entry=${JSON.stringify(entry2)}`);
      const entriesAfterTwo = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`DNS Cache Entries after second request: ${JSON.stringify(entriesAfterTwo)}`);
    } catch (error) {
      console.error(`Error on request ${request} to hostname=${hostname}:`, error);
    }
  },
});

const sleep = (miliseconds: number) => new Promise((resolve) => setTimeout(resolve, miliseconds));
