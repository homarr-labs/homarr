import { spawnSync } from "node:child_process";

const fullShaPattern = /^[0-9a-f]{40}$/iu;

export const releaseV2QaProfiles = ["main-writable", "main-readonly", "onboarding-fresh", "degraded"] as const;
export type ReleaseV2QaProfile = (typeof releaseV2QaProfiles)[number];

export interface ReleaseV2QaProfileFlags {
  demoMode: boolean;
  demoReadOnly: boolean;
  unsafeMockIntegration: boolean;
}

const expectedProfileFlags: Record<ReleaseV2QaProfile, ReleaseV2QaProfileFlags> = {
  "main-writable": { demoMode: true, demoReadOnly: false, unsafeMockIntegration: true },
  "main-readonly": { demoMode: true, demoReadOnly: true, unsafeMockIntegration: true },
  "onboarding-fresh": { demoMode: false, demoReadOnly: false, unsafeMockIntegration: true },
  degraded: { demoMode: true, demoReadOnly: false, unsafeMockIntegration: true },
};

const profileFlagEnvironmentNames = {
  demoMode: "DEMO_MODE",
  demoReadOnly: "DEMO_READ_ONLY",
  unsafeMockIntegration: "UNSAFE_ENABLE_MOCK_INTEGRATION",
} as const satisfies Record<keyof ReleaseV2QaProfileFlags, string>;

const parseStrictBoolean = (value: string | undefined) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

export const assertReleaseV2QaProfileEnvironment = (
  profile: ReleaseV2QaProfile,
  environment: NodeJS.ProcessEnv,
): ReleaseV2QaProfileFlags => {
  const expected = expectedProfileFlags[profile];
  const invalidFlags: string[] = [];

  for (const [flag, environmentName] of Object.entries(profileFlagEnvironmentNames) as Array<
    [keyof ReleaseV2QaProfileFlags, string]
  >) {
    const expectedValue = expected[flag];
    const actualValue = parseStrictBoolean(environment[environmentName]);
    if (actualValue !== expectedValue) invalidFlags.push(`${environmentName} (expected ${String(expectedValue)})`);
  }

  if (invalidFlags.length > 0) {
    throw new Error(`QA profile '${profile}' has invalid or missing environment flags: ${invalidFlags.join(", ")}`);
  }

  return { ...expected };
};

export const validateCandidateSha = (candidateSha: string, checkoutSha: string) => {
  if (!fullShaPattern.test(candidateSha)) {
    throw new Error("QA candidate must be a full 40-character Git SHA");
  }
  if (!fullShaPattern.test(checkoutSha)) {
    throw new Error("The checked-out HEAD did not resolve to a full 40-character Git SHA");
  }
  if (candidateSha.toLowerCase() !== checkoutSha.toLowerCase()) {
    throw new Error("QA candidate does not match the checked-out HEAD");
  }
  return checkoutSha.toLowerCase();
};

export const resolveCheckoutCandidateSha = (repoRoot: string) => {
  const result = spawnSync("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("Could not resolve the checked-out HEAD for QA provenance");
  const checkoutSha = result.stdout.trim();
  return validateCandidateSha(checkoutSha, checkoutSha);
};
