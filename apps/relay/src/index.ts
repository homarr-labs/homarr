import { createRelay } from "./relay";

function integerSetting(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  return value;
}

const relay = createRelay({
  hostname: process.env.HOST ?? "0.0.0.0",
  port: integerSetting("PORT", 8787),
  allowedOrigins: (process.env.RELAY_ALLOWED_ORIGINS ?? "https://remote.homarr.dev")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  registrationToken: process.env.RELAY_REGISTRATION_TOKEN,
  maxWorkers: integerSetting("RELAY_MAX_WORKERS", 1000),
  maxChannelsPerWorker: integerSetting("RELAY_MAX_CHANNELS_PER_WORKER", 64),
  maxConnections: integerSetting("RELAY_MAX_CONNECTIONS", 4096),
  maxConnectionsPerIp: integerSetting("RELAY_MAX_CONNECTIONS_PER_IP", 128),
  maxUpgradesPerMinute: integerSetting("RELAY_MAX_UPGRADES_PER_MINUTE", 120),
});

console.info(`Homarr opaque relay listening on port ${relay.server.port}`);

function shutdown() {
  void relay.stop();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
