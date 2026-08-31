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

export const validateResolvedArtifactPath = async (
  expectedPacketDirectory: string,
  artifactPath: string,
  label: string,
): Promise<string | null> => {
  if (!path.isAbsolute(artifactPath) || !isPathWithin(expectedPacketDirectory, artifactPath)) {
    return `${label} must use the packet's absolute artifact directory`;
  }

  let resolvedPacketDirectory: string;
  try {
    resolvedPacketDirectory = await realpath(expectedPacketDirectory);
  } catch (error) {
    return `${label} packet artifact directory does not resolve (${errorCode(error) ?? "unknown error"})`;
  }
  if (resolvedPacketDirectory !== path.resolve(expectedPacketDirectory)) {
    return `${label} packet artifact directory must not contain symlinks`;
  }

  let resolvedArtifact: string;
  try {
    resolvedArtifact = await realpath(artifactPath);
  } catch (error) {
    return `${label} does not resolve (${errorCode(error) ?? "unknown error"})`;
  }
  if (!isPathWithin(resolvedPacketDirectory, resolvedArtifact)) {
    return `${label} resolves outside the packet artifact directory`;
  }
  try {
    await assertSafeContainedPath(resolvedPacketDirectory, artifactPath, label);
    const artifactStats = await lstat(artifactPath);
    if (!artifactStats.isFile()) return `${label} must resolve to an existing regular file`;
  } catch (error) {
    return `${label} is not a safe regular file (${error instanceof Error ? error.message : "unknown error"})`;
  }
  return null;
};
