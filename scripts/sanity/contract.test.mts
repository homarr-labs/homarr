import assert from "node:assert/strict";
import test from "node:test";
import { getSanityDeterministicStatus, parseSanityReport } from "../../packages/boards/src/sanity-report.ts";
import type { SanityReport, SanityRunExpectation } from "../../packages/boards/src/sanity-report.ts";
import { checkGeometry } from "./geometry.mts";
import { selectPaths } from "./select.mts";

const image = "data:image/png;base64,iVBORw0KGgo=";
const check = { id: "footprint", label: "Footprint", status: "passed" as const, expected: "2x1", observed: "2x1" };
function report(): SanityReport {
  return {
    schemaVersion: 1,
    runId: "fixture",
    createdAt: "2026-10-25T12:00:00Z",
    mode: "pr",
    base: { label: "base", sourceSha: "a".repeat(40) },
    candidate: { label: "head", sourceSha: "b".repeat(40) },
    fixture: { id: "fixture", sha256: "c".repeat(64) },
    browser: { name: "chromium", version: "1", platform: "linux" },
    selection: {
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      scenarios: [{ id: "container", reasons: ["Grid changed"] }],
      unmappedPaths: [],
    },
    scenarios: [
      {
        id: "container",
        title: "Container",
        viewport: { width: 1280, height: 900 },
        before: { status: "complete", checks: [check], image, durationMs: 1 },
        after: { status: "complete", checks: [check], image, durationMs: 1 },
      },
    ],
    deterministicStatus: "passed",
    visualReview: { status: "pending" },
    timings: { startupMs: 1, checksMs: 1 },
  };
}

test("shared theme and deleted board paths select representative consumers", () => {
  const selection = selectPaths(["packages/ui/theme.ts", "apps/nextjs/src/components/board/removed-grid.tsx"]);
  assert.equal(selection.scenarios.length, 4);
  assert.equal(selection.unmappedPaths.length, 0);
  assert.ok(selection.scenarios.every((scenario) => scenario.reasons.length === 2));
});
test("unknown runtime changes block rather than selecting nothing successfully", () => {
  assert.deepEqual(selectPaths(["packages/integrations/src/new-provider.ts"]).unmappedPaths, [
    "packages/integrations/src/new-provider.ts",
  ]);
});
test("coverage decisions apply only to exact changed paths and cannot remove mandatory scenarios", () => {
  const selection = selectPaths(
    ["packages/ui/theme.ts", "packages/integrations/src/new-provider.ts"],
    [],
    [
      { path: "packages/ui/theme.ts", blobSha: "a".repeat(40), reason: "Only colors", scenarios: [] },
      {
        path: "packages/integrations/src/new-provider.ts",
        blobSha: "b".repeat(40),
        reason: "Provider-only transport change; dedicated integration evidence required",
        scenarios: [],
      },
    ],
    new Map([
      ["packages/ui/theme.ts", "a".repeat(40)],
      ["packages/integrations/src/new-provider.ts", "b".repeat(40)],
    ]),
  );
  assert.equal(selection.scenarios.length, 4);
  assert.deepEqual(selection.unmappedPaths, []);
  assert.equal(selection.coverageDecisions?.length, 2);
});
test("harness and publication workflow changes select the validator itself", () => {
  assert.equal(
    selectPaths(["scripts/sanity/seed.mts", ".github/workflows/deployment-docker-image.yml"]).scenarios.length,
    4,
  );
});
test("2x1 regression is caught by independent logical and pixel expectations", () => {
  const expected = [{ id: "empty", parent: "root", x: 0, y: 0, w: 2, h: 1 }];
  assert.ok(expected[0]);
  const observed = [{ ...expected[0], h: 2, bounds: { x: 0, y: 0, width: 200, height: 200 } }];
  const checks = checkGeometry(expected, observed);
  assert.equal(checks.find((entry) => entry.id === "empty:logical")?.status, "failed");
  assert.equal(checks.find((entry) => entry.id === "empty:pixels")?.status, "failed");
  assert.ok(observed[0]);
  observed[0].h = 1;
  assert.equal(checkGeometry(expected, observed).find((entry) => entry.id === "empty:pixels")?.status, "failed");
});
test("correct geometry passes while sibling overlap fails", () => {
  const expected = [
    { id: "first", parent: "root", x: 0, y: 0, w: 2, h: 1 },
    { id: "second", parent: "root", x: 2, y: 0, w: 2, h: 1 },
  ];
  const observed = expected.map((entry) => ({ ...entry, bounds: { x: entry.x * 100, y: 0, width: 200, height: 100 } }));
  assert.ok(checkGeometry(expected, observed).every((entry) => entry.status === "passed"));
  assert.ok(observed[1]);
  observed[1].bounds.x = 100;
  assert.equal(checkGeometry(expected, observed).find((entry) => entry.id === "no-overlap")?.status, "failed");
});
test("known-bad baseline may fail while candidate passes, without granting visual approval", () => {
  const value = report();
  assert.ok(value.scenarios[0]);
  value.scenarios[0].before.checks = [{ ...check, status: "failed", observed: "2x2" }];
  assert.equal(getSanityDeterministicStatus(value), "passed");
  assert.equal(parseSanityReport(JSON.stringify(value)).visualReview.status, "pending");
});
test("missing selected evidence and unmapped paths block", () => {
  const value = report();
  value.selection.scenarios.push({ id: "missing", reasons: ["Changed grid"] });
  assert.equal(getSanityDeterministicStatus(value), "blocked");
  const unknown = report();
  unknown.selection.unmappedPaths.push("unknown.ts");
  assert.equal(getSanityDeterministicStatus(unknown), "blocked");
});
test("import rejects stale identities, dishonest pass and remote images", () => {
  const stale = report();
  stale.candidate.sourceSha = "d".repeat(40);
  assert.throws(() => parseSanityReport(JSON.stringify(stale)), /identities disagree/);
  const dishonest = report();
  assert.ok(dishonest.scenarios[0]);
  dishonest.scenarios[0].after.checks = [{ ...check, status: "failed" }];
  assert.throws(() => parseSanityReport(JSON.stringify(dishonest)), /status disagrees/);
  const remote = report();
  assert.ok(remote.scenarios[0]);
  remote.scenarios[0].after.image = "https://example.test/tracker.png";
  assert.throws(() => parseSanityReport(JSON.stringify(remote)), /embedded PNG/);
});
test("release evidence requires exact image identities on both sides", () => {
  const value = report();
  value.mode = "release";
  assert.throws(() => parseSanityReport(JSON.stringify(value)), /exact image digests/);
  value.base.imageDigest = `sha256:${"a".repeat(64)}`;
  value.candidate.imageDigest = `sha256:${"b".repeat(64)}`;
  assert.equal(parseSanityReport(JSON.stringify(value)).mode, "release");
});

test("BuildKit provenance requires the exact platform, owned repository and immutable source SHA", async () => {
  const { extractBuildKitRevision } = await import("./provenance.mts");
  const args = { "vcs:source": "https://github.com/homarr-labs/homarr", "vcs:revision": "a".repeat(40) };
  const provenance = {
    "linux/amd64": { SLSA: { buildDefinition: { externalParameters: { request: { root: { request: { args } } } } } } },
  };
  assert.equal(extractBuildKitRevision(provenance, "linux/amd64"), "a".repeat(40));
  assert.throws(() => extractBuildKitRevision(provenance, "linux/arm64"), /Missing BuildKit/);
  args["vcs:source"] = "https://github.com/someone/other";
  assert.throws(() => extractBuildKitRevision(provenance, "linux/amd64"), /different repository/);
  args["vcs:source"] = "https://github.com/homarr-labs/homarr";
  args["vcs:revision"] = "v2.9.1";
  assert.throws(() => extractBuildKitRevision(provenance, "linux/amd64"), /exact source revision/);
});

test("stale coverage decisions cannot exempt later edits of the same file", () => {
  const path = "packages/integrations/src/provider.ts";
  const decisions = [{ path, blobSha: "a".repeat(40), reason: "Previously reviewed provider change", scenarios: [] }];
  assert.deepEqual(selectPaths([path], [], decisions, new Map([[path, "b".repeat(40)]])).unmappedPaths, [path]);
  assert.ok(decisions[0]);
  decisions[0].blobSha = "deleted";
  assert.deepEqual(selectPaths([path], [], decisions, new Map([[path, "deleted"]])).unmappedPaths, []);
});

test("PR image provenance preserves the exact requested manifest rather than the config ID", async () => {
  const { verifyImageSource } = await import("./provenance.mts");
  const revision = "a".repeat(40);
  const releaseDigest = `ghcr.io/homarr-labs/homarr@sha256:${"b".repeat(64)}`;
  const previewDigest = `ghcr.io/homarr-labs/homarr-test@sha256:${"c".repeat(64)}`;
  const inspectedImage = {
    Id: `sha256:${"d".repeat(64)}`,
    Architecture: "amd64",
    Os: "linux",
    RepoDigests: [releaseDigest, previewDigest],
    Config: { Labels: { "org.opencontainers.image.revision": revision } },
  };
  assert.deepEqual(verifyImageSource(inspectedImage, revision, previewDigest), {
    digest: `sha256:${"c".repeat(64)}`,
    source: "oci-label",
  });
  assert.deepEqual(verifyImageSource(inspectedImage, revision, releaseDigest), {
    digest: `sha256:${"b".repeat(64)}`,
    source: "oci-label",
  });
  assert.throws(
    () => verifyImageSource(inspectedImage, revision, `ghcr.io/homarr-labs/homarr-test@sha256:${"e".repeat(64)}`),
    /Requested image digest does not match/,
  );
  assert.throws(
    () =>
      verifyImageSource({ ...inspectedImage, RepoDigests: [] }, revision, "ghcr.io/homarr-labs/homarr-test:pr-test"),
    /exact inspected repository digest/,
  );
  assert.deepEqual(verifyImageSource({ ...inspectedImage, RepoDigests: [] }, revision, "homarr:local"), {
    digest: inspectedImage.Id,
    source: "oci-label",
  });
});

test("the board debug workbench route selects its own board scenarios", () => {
  const selection = selectPaths(["apps/nextjs/src/app/[locale]/debug/board/sanity/page.tsx"]);
  assert.equal(selection.scenarios.length, 4);
  assert.deepEqual(selection.unmappedPaths, []);
});

test("seeded-session checks cannot silently claim coverage for sign-in changes", () => {
  const selection = selectPaths(["packages/auth/configuration.ts"]);
  assert.equal(selection.scenarios.length, 4);
  assert.deepEqual(selection.unmappedPaths, ["packages/auth/configuration.ts"]);
  assert.ok(
    selection.scenarios.every((scenario) =>
      scenario.reasons.some((reason) => reason.includes("sign-in behavior requires a separate coverage decision")),
    ),
  );
});

test("an infrastructure error on either side blocks otherwise passing evidence", () => {
  for (const side of ["before", "after"] as const) {
    const value = report();
    assert.ok(value.scenarios[0]);
    value.scenarios[0][side].status = "error";
    value.scenarios[0][side].error = "Fixture canvas selector was ambiguous";
    assert.equal(getSanityDeterministicStatus(value), "blocked");
    assert.throws(() => parseSanityReport(JSON.stringify(value)), /status disagrees/);
  }
});

const expectedRun: SanityRunExpectation = {
  fixture: { id: "fixture", sha256: "c".repeat(64) },
  browser: { name: "chromium", version: "1", platform: "linux" },
};

test("current-run acceptance requires the independently expected fixture and browser", () => {
  assert.equal(parseSanityReport(JSON.stringify(report()), expectedRun).deterministicStatus, "passed");
});

test("an otherwise passing stale fixture remains inspectable but cannot satisfy the current run", () => {
  for (const fixture of [
    { id: "older-fixture", sha256: "c".repeat(64) },
    { id: "fixture", sha256: "d".repeat(64) },
  ]) {
    const stale = report();
    stale.fixture = fixture;
    const serialized = JSON.stringify(stale);
    assert.equal(parseSanityReport(serialized).deterministicStatus, "passed");
    assert.throws(() => parseSanityReport(serialized, expectedRun), /fixture identity does not match/);
  }
});

test("an otherwise passing report from another Chromium version cannot satisfy the current run", () => {
  const stale = report();
  stale.browser.version = "0.9";
  const serialized = JSON.stringify(stale);
  assert.equal(parseSanityReport(serialized).browser.version, "0.9");
  assert.throws(() => parseSanityReport(serialized, expectedRun), /browser identity does not match/);
});

test("malformed supplied expectations cannot fall back to historical inspection", () => {
  assert.throws(
    () => parseSanityReport(JSON.stringify(report()), null as unknown as SanityRunExpectation),
    /Invalid sanity report object/,
  );
});
