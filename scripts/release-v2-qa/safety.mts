import { randomUUID } from "node:crypto";
import { lstat, open, readFile, realpath, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const runRootNamePattern = /^homarr-release-v2-qa(?:$|-[A-Za-z0-9][A-Za-z0-9._-]*)$/u;
const zoomOutputNamePattern = /^homarr-release-v2-qa-zoom-[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const ipv6LoopbackHosts = new Set(["::1", "0:0:0:0:0:0:0:1"]);
const leaseSchemaVersion = 1;
const incompleteLeaseGraceMs = 30_000;

const missingPath = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";
const existingPath = (error: unknown) => (error as NodeJS.ErrnoException).code === "EEXIST";

export const assertSupportedRuntimePlatform = (platform: NodeJS.Platform = process.platform) => {
  if (platform !== "linux") {
    throw new Error(
      "Release-v2 QA runtime mutations are supported only on Linux because safe process ownership and cleanup require procfs and POSIX process groups",
    );
  }
};

export const isPathWithin = (parent: string, child: string) => {
  if (!path.isAbsolute(parent) || !path.isAbsolute(child)) return false;
  const relativePath = path.relative(path.resolve(parent), path.resolve(child));
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const canonicalTemporaryParent = async () => await realpath(path.resolve(tmpdir()));

const assertSafeTemporaryChild = async (
  target: string,
  options: {
    allowMissing?: boolean;
    label: string;
    namePattern: RegExp;
    nameRequirement: string;
  },
) => {
  const resolvedTarget = path.resolve(target);
  const canonicalParent = await canonicalTemporaryParent();
  const targetParent = path.dirname(resolvedTarget);
  let realTargetParent: string;
  try {
    realTargetParent = await realpath(targetParent);
  } catch (error) {
    if (missingPath(error)) {
      throw new Error(`${options.label} must be a direct child of the operating system temporary directory`, {
        cause: error,
      });
    }
    throw error;
  }
  if (realTargetParent !== canonicalParent) {
    throw new Error(`${options.label} must be a direct child of the operating system temporary directory`);
  }

  const targetName = path.basename(resolvedTarget);
  if (!options.namePattern.test(targetName)) {
    throw new Error(options.nameRequirement);
  }

  const canonicalTarget = path.join(canonicalParent, targetName);
  try {
    const stats = await lstat(canonicalTarget);
    if (stats.isSymbolicLink()) throw new Error(`${options.label} must not be a symlink`);
    if (!stats.isDirectory()) throw new Error(`${options.label} must be a directory`);
    if ((await realpath(canonicalTarget)) !== canonicalTarget) {
      throw new Error(`${options.label} must not contain symlink components`);
    }
  } catch (error) {
    if (missingPath(error) && options.allowMissing) return canonicalTarget;
    throw error;
  }

  return canonicalTarget;
};

export const assertSafeContainedPath = async (parent: string, child: string, label: string) => {
  const resolvedParent = path.resolve(parent);
  const resolvedChild = path.resolve(child);
  if (!isPathWithin(resolvedParent, resolvedChild)) {
    throw new Error(`${label} escapes its approved parent`);
  }

  const realParent = await realpath(resolvedParent);
  if (realParent !== resolvedParent) {
    throw new Error(`${label} parent contains a symlink`);
  }

  const relativePath = path.relative(resolvedParent, resolvedChild);
  let currentPath = resolvedParent;
  for (const segment of relativePath.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    try {
      const stats = await lstat(currentPath);
      if (stats.isSymbolicLink()) throw new Error(`${label} contains a symlink`);
    } catch (error) {
      if (missingPath(error)) break;
      throw error;
    }
  }

  return resolvedChild;
};

export const assertSafeRunRoot = async (runRoot: string, options: { allowMissing?: boolean } = {}) =>
  await assertSafeTemporaryChild(runRoot, {
    allowMissing: options.allowMissing,
    label: "The QA run-root",
    namePattern: runRootNamePattern,
    nameRequirement:
      'The QA run-root basename must start with "homarr-release-v2-qa" and use only safe suffix characters',
  });

export const assertSafeZoomOutput = async (outputDirectory: string, options: { allowMissing?: boolean } = {}) =>
  await assertSafeTemporaryChild(outputDirectory, {
    allowMissing: options.allowMissing,
    label: "The zoom extension output",
    namePattern: zoomOutputNamePattern,
    nameRequirement:
      'The zoom extension output basename must start with "homarr-release-v2-qa-zoom-" and use only safe suffix characters',
  });

const readLinuxProcessStartMarker = async (pid: number) => {
  if (process.platform !== "linux") return null;
  try {
    const processStat = await readFile(`/proc/${pid}/stat`, "utf8");
    const commandEnd = processStat.lastIndexOf(")");
    if (commandEnd < 0) return null;
    const fieldsAfterCommand = processStat
      .slice(commandEnd + 2)
      .trim()
      .split(/\s+/u);
    const startTime = fieldsAfterCommand[19];
    return startTime ? `linux:${startTime}` : null;
  } catch {
    return null;
  }
};

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

interface SlotLeaseOwner {
  schemaVersion: 1;
  pid: number;
  processStartMarker: string | null;
  token: string;
  runRoot: string;
  slot: number;
  operation: string;
  acquiredAt: string;
}

interface LeaseSnapshot {
  device: bigint;
  inode: bigint;
  modifiedMs: number;
  content: string;
  owner: SlotLeaseOwner | null;
}

export interface SlotLease {
  path: string;
  owner: SlotLeaseOwner;
  release: () => Promise<void>;
}

export const getSlotLeasePath = async (runRoot: string, slot: number) => {
  const canonicalRunRoot = await assertSafeRunRoot(runRoot, { allowMissing: true });
  const canonicalParent = await canonicalTemporaryParent();
  return path.join(canonicalParent, `.${path.basename(canonicalRunRoot)}.slot-${slot}.lease`);
};

const readLeaseSnapshot = async (leasePath: string): Promise<LeaseSnapshot> => {
  const stats = await lstat(leasePath, { bigint: true });
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`Refusing unsafe QA slot lease path: ${leasePath}`);
  }
  const content = await readFile(leasePath, "utf8");
  let owner: SlotLeaseOwner | null = null;
  try {
    owner = JSON.parse(content) as SlotLeaseOwner;
  } catch {
    // An acquiring process may have created the file but not completed its marker write yet.
  }
  return {
    device: stats.dev,
    inode: stats.ino,
    modifiedMs: Number(stats.mtimeMs),
    content,
    owner,
  };
};

const isValidLeaseOwner = (owner: SlotLeaseOwner | null, runRoot: string, slot: number): owner is SlotLeaseOwner =>
  owner?.schemaVersion === leaseSchemaVersion &&
  Number.isInteger(owner.pid) &&
  owner.pid > 0 &&
  typeof owner.token === "string" &&
  owner.token.length > 0 &&
  path.resolve(owner.runRoot) === runRoot &&
  owner.slot === slot;

const processMatchesLeaseOwner = async (owner: SlotLeaseOwner) => {
  if (!isProcessRunning(owner.pid)) return false;
  const observedStartMarker = await readLinuxProcessStartMarker(owner.pid);
  if (owner.processStartMarker && observedStartMarker) {
    return owner.processStartMarker === observedStartMarker;
  }
  // If the platform cannot verify process start identity, preserve the live lock rather than
  // risking recovery over an active owner.
  return true;
};

const sameLeaseSnapshot = (left: LeaseSnapshot, right: LeaseSnapshot) =>
  left.device === right.device &&
  left.inode === right.inode &&
  left.modifiedMs === right.modifiedMs &&
  left.content === right.content;

const recoverStaleLease = async (leasePath: string, snapshot: LeaseSnapshot) => {
  const confirmation = await readLeaseSnapshot(leasePath);
  if (!sameLeaseSnapshot(snapshot, confirmation)) {
    throw new Error(`QA slot lease changed during stale recovery: ${leasePath}`);
  }
  await unlink(leasePath);
};

export const acquireSlotLease = async (
  runRoot: string,
  slot: number,
  operation: string,
  platform: NodeJS.Platform = process.platform,
): Promise<SlotLease> => {
  assertSupportedRuntimePlatform(platform);
  if (![1, 2, 3].includes(slot)) throw new Error("QA slot lease requires slot 1, 2, or 3");
  const canonicalRunRoot = await assertSafeRunRoot(runRoot, { allowMissing: true });
  const leasePath = await getSlotLeasePath(canonicalRunRoot, slot);
  const owner: SlotLeaseOwner = {
    schemaVersion: leaseSchemaVersion,
    pid: process.pid,
    processStartMarker: await readLinuxProcessStartMarker(process.pid),
    token: randomUUID(),
    runRoot: canonicalRunRoot,
    slot,
    operation,
    acquiredAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(leasePath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }

      return {
        path: leasePath,
        owner,
        release: async () => {
          const snapshot = await readLeaseSnapshot(leasePath);
          if (!isValidLeaseOwner(snapshot.owner, canonicalRunRoot, slot) || snapshot.owner?.token !== owner.token) {
            throw new Error(`Refusing to release a QA slot lease owned by another process: ${leasePath}`);
          }
          await recoverStaleLease(leasePath, snapshot);
        },
      };
    } catch (error) {
      if (!existingPath(error)) throw error;
      const snapshot = await readLeaseSnapshot(leasePath);
      const existingOwner = snapshot.owner;
      if (!isValidLeaseOwner(existingOwner, canonicalRunRoot, slot)) {
        if (Date.now() - snapshot.modifiedMs < incompleteLeaseGraceMs) {
          throw new Error(`QA slot ${slot} lease is being initialized by another operation`, { cause: error });
        }
        await recoverStaleLease(leasePath, snapshot);
        continue;
      }
      if (await processMatchesLeaseOwner(existingOwner)) {
        throw new Error(`QA slot ${slot} is busy with ${existingOwner.operation} owned by PID ${existingOwner.pid}`, {
          cause: error,
        });
      }
      await recoverStaleLease(leasePath, snapshot);
    }
  }

  throw new Error(`Unable to acquire QA slot ${slot} lease after stale recovery`);
};

const normalizedHost = (host: string) => {
  const lowerHost = host.toLowerCase();
  if (lowerHost.startsWith("[") && lowerHost.endsWith("]")) return lowerHost.slice(1, -1);
  return lowerHost;
};

export const validateLoopbackHost = (host: string) => {
  const normalized = normalizedHost(host);
  if (normalized !== "127.0.0.1" && normalized !== "localhost" && !ipv6LoopbackHosts.has(normalized)) {
    throw new Error("The fixture host must be an explicit loopback address");
  }
  return normalized;
};

export const validateFixtureUrl = (value: string) => {
  let fixtureUrl: URL;
  try {
    fixtureUrl = new URL(value);
  } catch {
    throw new Error("The fixture URL must be a valid loopback HTTP origin");
  }

  if (
    fixtureUrl.protocol !== "http:" ||
    fixtureUrl.username ||
    fixtureUrl.password ||
    fixtureUrl.pathname !== "/" ||
    fixtureUrl.search ||
    fixtureUrl.hash
  ) {
    throw new Error("The fixture URL must be a credential-free loopback HTTP origin");
  }
  try {
    validateLoopbackHost(fixtureUrl.hostname);
  } catch {
    throw new Error("The fixture URL must be a credential-free loopback HTTP origin");
  }
  return fixtureUrl.origin;
};

export const sanitizeAppEnvironment = (environment: NodeJS.ProcessEnv) => {
  const sanitized = { ...environment };
  delete sanitized.QA_PASSWORD;
  delete sanitized.QA_PASSWORD_FILE;
  return sanitized;
};

export const createFixtureEnvironment = (runId: string): NodeJS.ProcessEnv => ({ QA_RUN_ID: runId });
