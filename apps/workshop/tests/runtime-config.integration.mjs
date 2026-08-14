import vm from "node:vm";

const baseUrl = process.env.WORKSHOP_TEST_URL;
if (!baseUrl) throw new Error("WORKSHOP_TEST_URL is required");

const response = await fetch(`${baseUrl}/workshop-runtime-config.js`);
if (!response.ok) throw new Error(`Runtime configuration returned ${response.status}`);

const context = { TextDecoder, Uint8Array, atob };
context.globalThis = context;
vm.runInNewContext(await response.text(), context);

const actual = JSON.parse(JSON.stringify(context.homarrRuntimeConfig));
const expected = {
  homarrWebsiteUrl: process.env.EXPECTED_HOMARR_WEBSITE_URL,
  workshopApiUrl: process.env.EXPECTED_WORKSHOP_API_URL,
  workshopWebUrl: process.env.EXPECTED_WORKSHOP_WEB_URL,
};

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected Workshop runtime configuration: ${JSON.stringify(actual)}`);
}

console.log("Workshop runtime configuration passed");
