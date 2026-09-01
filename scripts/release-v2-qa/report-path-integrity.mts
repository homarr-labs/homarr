import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { assertSafeContainedPath, isPathWithin } from "./safety.mts";

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code;

export const assertSafeReportPath = async (qaRoot: string, target: string, label: string): Promise<string> =>
  assertSafeContainedPath(qaRoot, target, label);

export const readSafeReportFile = async (qaRoot: string, target: string, label: string): Promise<string> => {
  await assertSafeReportPath(qaRoot, target, label);
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
};

export const writeSafeReportFile = async (
  qaRoot: string,
  target: string,
  content: string,
  label: string,
): Promise<void> => {
  await assertSafeReportPath(qaRoot, target, label);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW;
  const handle = await open(target, flags, 0o666);
  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
};

interface ArtifactDirectoryMessages {
  absolutePathRequirement: string;
  directoryName: string;
}

const packetArtifactDirectoryMessages: ArtifactDirectoryMessages = {
  absolutePathRequirement: "the packet's absolute artifact directory",
  directoryName: "packet artifact directory",
};

const reproductionArtifactDirectoryMessages: ArtifactDirectoryMessages = {
  absolutePathRequirement: "the absolute release-v2 artifact directory",
  directoryName: "release-v2 artifact directory",
};

const validateResolvedArtifactPathWithin = async (
  expectedDirectory: string,
  artifactPath: string,
  label: string,
  messages: ArtifactDirectoryMessages,
): Promise<string | null> => {
  if (!path.isAbsolute(artifactPath) || !isPathWithin(expectedDirectory, artifactPath)) {
    return `${label} must use ${messages.absolutePathRequirement}`;
  }

  let resolvedExpectedDirectory: string;
  try {
    resolvedExpectedDirectory = await realpath(expectedDirectory);
  } catch (error) {
    return `${label} ${messages.directoryName} does not resolve (${errorCode(error) ?? "unknown error"})`;
  }
  if (resolvedExpectedDirectory !== path.resolve(expectedDirectory)) {
    return `${label} ${messages.directoryName} must not contain symlinks`;
  }

  let resolvedArtifact: string;
  try {
    resolvedArtifact = await realpath(artifactPath);
  } catch (error) {
    return `${label} does not resolve (${errorCode(error) ?? "unknown error"})`;
  }
  if (!isPathWithin(resolvedExpectedDirectory, resolvedArtifact)) {
    return `${label} resolves outside the ${messages.directoryName}`;
  }
  try {
    await assertSafeContainedPath(resolvedExpectedDirectory, artifactPath, label);
    const artifactStats = await lstat(artifactPath);
    if (!artifactStats.isFile()) return `${label} must resolve to an existing regular file`;
  } catch (error) {
    return `${label} is not a safe regular file (${error instanceof Error ? error.message : "unknown error"})`;
  }
  return null;
};

export const validateResolvedArtifactPath = async (
  expectedPacketDirectory: string,
  artifactPath: string,
  label: string,
): Promise<string | null> =>
  validateResolvedArtifactPathWithin(expectedPacketDirectory, artifactPath, label, packetArtifactDirectoryMessages);

export const validateResolvedReproductionEvidencePath = async (
  releaseArtifactDirectory: string,
  artifactPath: string,
  label: string,
): Promise<string | null> =>
  validateResolvedArtifactPathWithin(
    releaseArtifactDirectory,
    artifactPath,
    label,
    reproductionArtifactDirectoryMessages,
  );
