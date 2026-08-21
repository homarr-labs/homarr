import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { command, number, positional, string } from "@drizzle-team/brocli";

const execFileAsync = promisify(execFile);
const environmentSeparator = "\u0000";
const validEnvironmentName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const validHarnessName = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/;

const demoEnvironment: ReadonlyArray<[string, string]> = [
  ["DEMO_MODE", "true"],
  ["DEMO_READ_ONLY", "false"],
  ["UNSAFE_ENABLE_MOCK_INTEGRATION", "true"],
];

type HarnessRuntimeOptions = {
  name: string;
  env?: string;
  port?: number;
};

const runtimeOptions = () => ({
  name: positional("name").required().desc("Name used for the image, container, and data volume"),
  env: string("env").alias("e").desc("Environment override KEY=VALUE; repeat the flag for more values"),
  port: number("port").int().min(0).max(65535).desc("Host port, or 0 for an automatically assigned port"),
});

function validateHarnessName(name: string): string {
  if (!validHarnessName.test(name)) {
    throw new Error("Harness name must be 1-63 characters and contain only letters, numbers, '.', '_' or '-'");
  }

  return name;
}

function imageName(name: string): string {
  return `homarr:${validateHarnessName(name)}`;
}

function containerName(name: string): string {
  return `homarr-harness-${validateHarnessName(name)}`;
}

function volumeName(name: string): string {
  return `homarr-harness-${validateHarnessName(name)}-data`;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function commandError(commandName: string, error: unknown): Error {
  if (hasErrorCode(error, "ENOENT")) {
    return new Error(`${commandName} is required but was not found on PATH`);
  }

  if (error instanceof Error) {
    return new Error(`${commandName} failed: ${error.message}`);
  }

  return new Error(`${commandName} failed`);
}

async function execCommand(commandName: string, args: string[], cwd?: string): Promise<string> {
  try {
    const result = await execFileAsync(commandName, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    return result.stdout.trim();
  } catch (error) {
    throw commandError(commandName, error);
  }
}

async function runCommand(commandName: string, args: string[], cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(commandName, args, {
      cwd,
      stdio: "inherit",
    });

    child.once("error", (error) => reject(commandError(commandName, error)));
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      reject(new Error(`${commandName} failed with ${reason}`));
    });
  });
}

async function repositoryRoot(): Promise<string> {
  const root = await execCommand("git", ["rev-parse", "--show-toplevel"], process.cwd());

  try {
    await access(join(root, "Dockerfile"), constants.R_OK);
  } catch {
    throw new Error("Run the harness command from a Homarr checkout containing a Dockerfile");
  }

  return root;
}

function parseEnvironmentOverrides(raw?: string): Map<string, string> {
  const values = raw?.split(environmentSeparator) ?? [];
  const environment = new Map(demoEnvironment);

  for (const value of values) {
    const separator = value.indexOf("=");
    if (separator <= 0) {
      throw new Error(`Invalid environment override ${JSON.stringify(value)}; use KEY=VALUE`);
    }

    const name = value.slice(0, separator);
    if (!validEnvironmentName.test(name)) {
      throw new Error(`Invalid environment variable name ${JSON.stringify(name)}`);
    }

    environment.set(name, value.slice(separator + 1));
  }

  return environment;
}

function isEncryptionKey(value: string | undefined): value is string {
  return value !== undefined && /^[a-f0-9]{64}$/i.test(value);
}

async function readEncryptionKey(path: string): Promise<string | undefined> {
  try {
    const value = (await readFile(path, "utf8")).trim();
    if (isEncryptionKey(value)) {
      return value;
    }

    throw new Error(`Invalid encryption key in ${path}`);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return undefined;
    }

    throw error;
  }
}

async function harnessEncryptionKey(name: string): Promise<string> {
  if (isEncryptionKey(process.env.SECRET_ENCRYPTION_KEY)) {
    return process.env.SECRET_ENCRYPTION_KEY;
  }

  const configRoot = process.env.HOMARR_HARNESS_CONFIG_DIR ?? join(homedir(), ".config", "homarr");
  const keyPath = join(configRoot, "local-harness", `${validateHarnessName(name)}.key`);
  const existingKey = await readEncryptionKey(keyPath);
  if (existingKey) {
    return existingKey;
  }

  const newKey = randomBytes(32).toString("hex");
  await mkdir(join(configRoot, "local-harness"), { recursive: true, mode: 0o700 });

  try {
    await writeFile(keyPath, `${newKey}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    return newKey;
  } catch (error) {
    if (!hasErrorCode(error, "EEXIST")) {
      throw error;
    }

    const racedKey = await readEncryptionKey(keyPath);
    if (racedKey) {
      return racedKey;
    }

    throw new Error(`Could not read the harness encryption key at ${keyPath}`, { cause: error });
  }
}

async function harnessEnvironment(name: string, raw?: string): Promise<string[]> {
  const environment = parseEnvironmentOverrides(raw);

  if (!environment.has("SECRET_ENCRYPTION_KEY")) {
    environment.set("SECRET_ENCRYPTION_KEY", await harnessEncryptionKey(name));
  }

  return Array.from(environment, ([key, value]) => `${key}=${value}`);
}

async function buildHarnessImage(name: string): Promise<void> {
  const root = await repositoryRoot();
  const image = imageName(name);

  console.log(`Building ${image} from ${root}`);
  await runCommand("docker", ["build", "--tag", image, "."], root);
  console.log(`Built ${image}`);
}

async function removeExistingContainer(name: string): Promise<void> {
  try {
    await execCommand("docker", ["rm", "--force", containerName(name)]);
  } catch {
    // A missing container is the normal first-run path. Docker reports it as
    // an error, so the cleanup is intentionally best-effort.
  }
}

async function publishedPort(name: string): Promise<number> {
  const output = await execCommand("docker", ["port", containerName(name), "7575/tcp"]);

  for (const line of output.split("\n")) {
    const match = line.trim().match(/:(\d+)$/);
    if (match) {
      return Number(match[1]);
    }
  }

  throw new Error(`Container ${containerName(name)} has no published port for 7575/tcp`);
}

async function startHarness(options: HarnessRuntimeOptions): Promise<void> {
  const name = validateHarnessName(options.name);
  const image = imageName(name);
  const container = containerName(name);
  const requestedPort = options.port ?? 0;
  const environment = await harnessEnvironment(name, options.env);

  await removeExistingContainer(name);
  console.log(`Starting ${container} from ${image}`);
  await runCommand("docker", [
    "run",
    "--detach",
    "--name",
    container,
    "--publish",
    `${requestedPort}:7575`,
    "--volume",
    `${volumeName(name)}:/appdata`,
    ...environment.flatMap((value) => ["--env", value]),
    image,
  ]);

  const port = await publishedPort(name);
  console.log(`Harness ${name} is running`);
  console.log(`  Container : ${container}`);
  console.log(`  Image     : ${image}`);
  console.log(`  Port      : ${port}`);
  console.log(`  URL       : http://127.0.0.1:${port}`);
}

export const normalizeHarnessEnvironmentArgs = (argv: string[]): string[] => {
  const normalized = argv.slice(0, 2);
  const args = argv.slice(2);
  const environmentValues: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === "--env" || arg === "-e") {
      const value = args[index + 1];
      if (value === undefined) {
        normalized.push(arg);
        continue;
      }

      environmentValues.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--env=")) {
      environmentValues.push(arg.slice("--env=".length));
      continue;
    }

    normalized.push(arg);
  }

  if (environmentValues.length > 0) {
    normalized.push(`--env=${environmentValues.join(environmentSeparator)}`);
  }

  return normalized;
};

const harnessBuild = command({
  name: "build",
  desc: "Build the current checkout as a named local Homarr image",
  options: {
    name: positional("name").required().desc("Local image tag"),
  },
  handler: async ({ name }) => buildHarnessImage(name),
});

const harnessRun = command({
  name: "run",
  aliases: ["start", "up"],
  desc: "Run a named local image in writable demo mode",
  options: runtimeOptions(),
  handler: async (options) => startHarness(options),
});

const harnessSetup = command({
  name: "setup",
  aliases: ["create"],
  desc: "Build the current checkout and run its writable demo harness",
  options: runtimeOptions(),
  handler: async (options) => {
    await buildHarnessImage(options.name);
    await startHarness(options);
  },
});

const harnessPort = command({
  name: "port",
  desc: "Show the published host port and URL for a harness",
  options: {
    name: positional("name").required().desc("Harness name"),
  },
  handler: async ({ name }) => {
    const port = await publishedPort(name);
    console.log(`Port: ${port}`);
    console.log(`URL: http://127.0.0.1:${port}`);
  },
});

const harnessStop = command({
  name: "stop",
  aliases: ["down"],
  desc: "Stop a local harness container and keep its data volume",
  options: {
    name: positional("name").required().desc("Harness name"),
  },
  handler: async ({ name }) => {
    const container = containerName(name);
    await execCommand("docker", ["stop", container]);
    console.log(`Stopped ${container}`);
  },
});

export const harnessRoot = command({
  name: "harness",
  aliases: ["local-harness"],
  desc: "Build and run a local branch in a browser-ready demo harness",
  subcommands: [harnessBuild, harnessRun, harnessSetup, harnessPort, harnessStop],
});
