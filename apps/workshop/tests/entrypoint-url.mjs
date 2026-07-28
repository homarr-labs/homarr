import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const entrypoint = resolve("apps/workshop/entrypoint.sh");
const validator = resolve("apps/workshop/workshop-url.awk");

const validate = (value) =>
  spawnSync("sh", [entrypoint, "--validate-url", "TEST_URL", value], {
    encoding: "utf8",
    env: { ...process.env, WORKSHOP_URL_VALIDATOR_PATH: validator },
  });

const validateDocsBaseUrl = (value) =>
  spawnSync("sh", [entrypoint, "--validate-docs-base-url", value], {
    encoding: "utf8",
  });

for (const [value, expected] of [
  ["http://127.0.0.1:8090/", "http://127.0.0.1:8090"],
  ["https://example.com/docs/", "https://example.com/docs"],
  ["https://example.com:0/", "https://example.com:0"],
  ["https://[::1]:8090/workshop/", "https://[::1]:8090/workshop"],
]) {
  const result = validate(value);
  if (result.status !== 0 || result.stdout.trim() !== expected) {
    throw new Error(`Expected valid runtime URL ${value}: ${result.stderr || result.stdout}`);
  }
}

for (const value of [
  "",
  "http://",
  "http:///docs",
  "https://:",
  "https://example.com:65536",
  "https://::1",
  "https://[:::1]",
  "http://[:1:2:3:4:5:6:7:8]",
  "http://[1:2:3:4:5:6:7:8:]",
  "https://1.2.3.4.5",
  "http://09.0.0.1",
  "http://099.0.0.1",
  "http://[::ffff:192.168.001.001]",
  "http://[::ffff:192.168.1.01]",
  "http://[fe80::1%25eth0]",
  "https://user:password@example.com",
  "https://example.com/workshop?token=secret",
  "https://example.com/workshop#fragment",
  "https://example.com/\tworkshop",
  "https://example.com/\nworkshop",
]) {
  const result = validate(value);
  if (result.status === 0) throw new Error(`Expected invalid runtime URL to be rejected: ${JSON.stringify(value)}`);
}

for (const [value, expected] of [
  ["/", "/"],
  ["/docs/", "/docs"],
  ["/docs..preview", "/docs..preview"],
]) {
  const result = validateDocsBaseUrl(value);
  if (result.status !== 0 || result.stdout.trim() !== expected) {
    throw new Error(`Expected valid DOCS_BASE_URL ${value}: ${result.stderr || result.stdout}`);
  }
}

for (const value of ["docs", "/../docs", "/docs/../private", "/./docs", "/docs?preview=1"]) {
  const result = validateDocsBaseUrl(value);
  if (result.status === 0) throw new Error(`Expected invalid DOCS_BASE_URL to be rejected: ${JSON.stringify(value)}`);
}

console.log("Workshop runtime URL validation passed");
