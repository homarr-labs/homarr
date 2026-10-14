import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { useRuntimeConfig } from "nitro/runtime-config";
import { z } from "zod";

export const fixtureDatabaseRelativePath = ".fixture-data/fixture.sqlite";

export function getFixtureConfig() {
  const origin = new URL(process.env.NITRO_FIXTURE_ORIGIN ?? "http://127.0.0.1:3100");
  if (
    origin.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("NITRO_FIXTURE_ORIGIN must be an explicit loopback HTTP origin");
  }
  const cwd = realpathSync(process.cwd());
  const databasePath = resolve(cwd, fixtureDatabaseRelativePath);
  if (cwd === "/appdata" || cwd.startsWith("/appdata/")) {
    throw new Error("The experiment must never run inside Homarr appdata");
  }
  const directory = resolve(cwd, ".fixture-data");
  if (existsSync(directory) && realpathSync(directory) !== directory) {
    throw new Error("The disposable fixture directory must not be a symlink");
  }
  if (existsSync(databasePath) && realpathSync(databasePath) !== databasePath) {
    throw new Error("The disposable fixture database must not be a symlink");
  }
  return {
    origin: origin.origin,
    host: origin.host,
    databasePath,
    fixtureOnly: true,
    locale: "en",
    theme: "light",
    buildId: z.string().min(1).max(128).parse(useRuntimeConfig().fixtureBuildId),
    render: { maxEntries: 32, maxBytes: 8388608, maxArtifactBytes: 1048576, maxAgeMs: 30000, maxInFlight: 4 },
    widget: {
      maxEntries: 2,
      maxBytes: 32768,
      freshMs: 5000,
      staleMs: 60000,
      maxInFlight: 2,
      timeoutMs: 750,
      maxResponseBytes: 4096,
      pollMs: 5000,
    },
    session: { maxEntries: 64, ttlMs: 900000, cookieName: "nitro_fixture_session" },
  } as const;
}

export type FixtureConfig = ReturnType<typeof getFixtureConfig>;
