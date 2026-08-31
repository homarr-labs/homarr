// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertSafeReportPath,
  readSafeReportFile,
  validateResolvedArtifactPath,
  writeSafeReportFile,
} from "./report-path-integrity.mts";

const temporaryPaths: string[] = [];

const temporaryDirectory = async (suffix: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), `homarr-release-v2-qa-${suffix}-`));
  temporaryPaths.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((target) => rm(target, { force: true, recursive: true })));
});

describe("release-v2 QA report path integrity", () => {
  it.each(["reports/preflight-01/report.md", "ledger.json", "master-report.md"])(
    "rejects a symlinked aggregate input or output path: %s",
    async (relativePath) => {
      const qaRoot = await temporaryDirectory("report-path");
      const target = path.join(qaRoot, "outside-target");
      const linkedPath = path.join(qaRoot, relativePath);
      await mkdir(path.dirname(linkedPath), { recursive: true });
      await writeFile(target, "outside");
      await symlink(target, linkedPath);

      await expect(assertSafeReportPath(qaRoot, linkedPath, "QA report path")).rejects.toThrow("symlink");
      await expect(readSafeReportFile(qaRoot, linkedPath, "QA report path")).rejects.toThrow("symlink");
      await expect(writeSafeReportFile(qaRoot, linkedPath, "replacement", "QA report path")).rejects.toThrow("symlink");
      await expect(readFile(target, "utf8")).resolves.toBe("outside");
    },
  );

  it("rejects an artifact symlink that ultimately escapes its packet directory", async () => {
    const root = await temporaryDirectory("artifact-escape");
    const packetDirectory = path.join(root, ".screenshots", "release-v2", "preflight-01");
    const outsideArtifact = path.join(root, "outside.png");
    const linkedArtifact = path.join(packetDirectory, "escape.png");
    await mkdir(packetDirectory, { recursive: true });
    await writeFile(outsideArtifact, "outside");
    await symlink(outsideArtifact, linkedArtifact);

    await expect(
      validateResolvedArtifactPath(packetDirectory, linkedArtifact, "preflight-01: artifact"),
    ).resolves.toContain("resolves outside");
  });

  it("accepts a resolved regular artifact inside the packet directory", async () => {
    const root = await temporaryDirectory("artifact-valid");
    const packetDirectory = path.join(root, ".screenshots", "release-v2", "preflight-01");
    const artifact = path.join(packetDirectory, "valid.png");
    await mkdir(packetDirectory, { recursive: true });
    await writeFile(artifact, "valid");

    await expect(validateResolvedArtifactPath(packetDirectory, artifact, "preflight-01: artifact")).resolves.toBeNull();
  });

  it("rejects an artifact directory and an in-directory artifact symlink", async () => {
    const root = await temporaryDirectory("artifact-not-file");
    const packetDirectory = path.join(root, ".screenshots", "release-v2", "preflight-01");
    const artifactDirectory = path.join(packetDirectory, "looks-like-evidence.png");
    const realArtifact = path.join(packetDirectory, "real.png");
    const linkedArtifact = path.join(packetDirectory, "linked.png");
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(realArtifact, "valid");
    await symlink(realArtifact, linkedArtifact);

    await expect(
      validateResolvedArtifactPath(packetDirectory, artifactDirectory, "preflight-01: artifact"),
    ).resolves.toContain("regular file");
    await expect(
      validateResolvedArtifactPath(packetDirectory, linkedArtifact, "preflight-01: artifact"),
    ).resolves.toContain("symlink");
  });

  it.runIf(process.platform !== "win32")("rejects a FIFO artifact", async () => {
    const root = await temporaryDirectory("artifact-fifo");
    const packetDirectory = path.join(root, ".screenshots", "release-v2", "preflight-01");
    const fifoArtifact = path.join(packetDirectory, "capture.pipe");
    await mkdir(packetDirectory, { recursive: true });
    const result = spawnSync("mkfifo", [fifoArtifact]);
    expect(result.status).toBe(0);

    await expect(
      validateResolvedArtifactPath(packetDirectory, fifoArtifact, "preflight-01: artifact"),
    ).resolves.toContain("regular file");
  });

  it.runIf(process.platform !== "win32")("rejects a socket artifact", async () => {
    const root = await temporaryDirectory("artifact-socket");
    const packetDirectory = path.join(root, ".screenshots", "release-v2", "preflight-01");
    const socketArtifact = path.join(packetDirectory, "capture.sock");
    await mkdir(packetDirectory, { recursive: true });
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketArtifact, resolve);
    });
    try {
      await expect(
        validateResolvedArtifactPath(packetDirectory, socketArtifact, "preflight-01: artifact"),
      ).resolves.toContain("regular file");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
