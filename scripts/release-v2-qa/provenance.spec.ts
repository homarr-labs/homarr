// @vitest-environment node

import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, test } from "vitest";

import { assertReleaseV2QaProfileEnvironment, releaseV2QaProfiles, validateCandidateSha } from "./provenance.mts";
import type { ReleaseV2QaProfile } from "./provenance.mts";

const disposableDirectories: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, "../..");
const profileEnvironmentNames = ["DEMO_MODE", "DEMO_READ_ONLY", "UNSAFE_ENABLE_MOCK_INTEGRATION"] as const;

afterEach(async () => {
  await Promise.all(
    disposableDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

const environmentForProfile = (profile: ReleaseV2QaProfile): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {
    DEMO_MODE: "true",
    DEMO_READ_ONLY: "false",
    UNSAFE_ENABLE_MOCK_INTEGRATION: "true",
  };
  if (profile === "main-readonly") environment.DEMO_READ_ONLY = "true";
  if (profile === "onboarding-fresh") environment.DEMO_MODE = "false";
  return environment;
};

describe("release-v2 QA candidate provenance", () => {
  test("accepts only the exact checked-out commit", () => {
    const checkoutSha = "a".repeat(40);

    expect(validateCandidateSha(checkoutSha.toUpperCase(), checkoutSha)).toBe(checkoutSha);
    expect(() => validateCandidateSha("b".repeat(40), checkoutSha)).toThrow("checked-out HEAD");
    expect(() => validateCandidateSha("not-a-sha", checkoutSha)).toThrow("full 40-character Git SHA");
  });
});

describe("release-v2 QA profile provenance", () => {
  test.each(releaseV2QaProfiles)("accepts the exact %s profile matrix", (profile) => {
    expect(assertReleaseV2QaProfileEnvironment(profile, environmentForProfile(profile))).toEqual({
      demoMode: profile !== "onboarding-fresh",
      demoReadOnly: profile === "main-readonly",
      unsafeMockIntegration: true,
    });
  });

  test.each(profileEnvironmentNames)("rejects an unset %s flag", (environmentName) => {
    const environment = environmentForProfile("main-writable");
    delete environment[environmentName];

    expect(() => assertReleaseV2QaProfileEnvironment("main-writable", environment)).toThrow(
      new RegExp(`${environmentName} \\(expected (?:true|false)\\)`, "u"),
    );
  });

  test.each(["1", "0", "TRUE", "False", "yes", " true ", "", "unexpected-private-marker"])(
    "rejects the malformed strict boolean %j without echoing it",
    (malformedValue) => {
      for (const environmentName of profileEnvironmentNames) {
        const environment = environmentForProfile("main-writable");
        environment[environmentName] = malformedValue;

        expect(() => assertReleaseV2QaProfileEnvironment("main-writable", environment)).toThrow(environmentName);
        try {
          assertReleaseV2QaProfileEnvironment("main-writable", environment);
        } catch (error) {
          expect((error as Error).message).not.toContain(malformedValue || "unexpected-private-marker");
        }
      }
    },
  );

  test.each(releaseV2QaProfiles)("rejects every mismatched flag for %s", (profile) => {
    const expectedEnvironment = environmentForProfile(profile);
    for (const environmentName of profileEnvironmentNames) {
      const environment = { ...expectedEnvironment };
      environment[environmentName] = environment[environmentName] === "true" ? "false" : "true";
      expect(() => assertReleaseV2QaProfileEnvironment(profile, environment)).toThrow(environmentName);
    }
  });

  test("rejects a writable ambient environment before a read-only reset or manifest write", async () => {
    const disposableDirectory = await mkdtemp(path.join(tmpdir(), "homarr-release-v2-qa-profile-flags-"));
    disposableDirectories.push(disposableDirectory);
    const databasePath = path.join(disposableDirectory, "fixture.sqlite");
    const outputDirectory = path.join(disposableDirectory, "output");
    const database = new Database(databasePath);
    database.exec("CREATE TABLE mutation_guard (value TEXT NOT NULL); INSERT INTO mutation_guard VALUES ('preserved')");
    database.close();
    const databaseBefore = await readFile(databasePath);

    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(repoRoot, "scripts/release-v2-qa/seed.mts"),
        "--profile",
        "main-readonly",
        "--output",
        outputDirectory,
        "--reset",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          DB_DRIVER: "better-sqlite3",
          DB_URL: databasePath,
          DEMO_MODE: "true",
          DEMO_READ_ONLY: "false",
          UNSAFE_ENABLE_MOCK_INTEGRATION: "true",
        },
        timeout: 30_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DEMO_READ_ONLY (expected true)");
    expect(result.stderr).not.toContain("no such table");
    expect(await readFile(databasePath)).toEqual(databaseBefore);
    await expect(access(path.join(outputDirectory, "fixture-manifest.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
