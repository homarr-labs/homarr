import { command, string } from "@drizzle-team/brocli";

import "@homarr/common/init-dns";

global.homarr.dnsCacheManager?.initialize();

export const dnsUrlTest = command({
  name: "dns-url-test",
  desc: "Try out if dns-caching for urls is working",
  options: {
    url: string("url").required().alias("u").desc("Url to call for action"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async ({ url }) => {
    let request = 1;
    try {
      const initialEntries = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`Initial DNS Cache Entries: ${JSON.stringify(initialEntries)}`);
      const response = await fetch(url);
      console.log(`Received first response url=${url} status=${response.status}`);
      const entriesAfterOne = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`DNS Cache Entries after first request: ${JSON.stringify(entriesAfterOne)}`);

      await sleep(1000);

      request++;
      const response2 = await fetch(url);
      console.log(`Received second response url=${url} status=${response2.status}`);
      const entriesAfterTwo = global.homarr.dnsCacheManager?.getCacheEntries();
      console.log(`DNS Cache Entries after second request: ${JSON.stringify(entriesAfterTwo)}`);
    } catch (error) {
      console.error(`Error on request ${request} to url=${url}:`, error);
    }
  },
});

const sleep = (miliseconds: number) => new Promise((resolve) => setTimeout(resolve, miliseconds));
