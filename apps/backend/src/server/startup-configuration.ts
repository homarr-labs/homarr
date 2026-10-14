import type { Stats } from "node:fs";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { isIP } from "node:net";
import { basename, dirname, isAbsolute, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { captureHostConfiguration } from "./runtime-composition/configuration";
import type { PublicHostConfiguration } from "./runtime-composition/contracts";
import type { createPublicHostRuntime } from "./runtime-composition/runtime";

type CultureOptions = ReturnType<Parameters<typeof createPublicHostRuntime>[0]["cultureOptions"]>;

export interface StartupConfiguration {
  readonly version: 1;
  readonly listener: { readonly hostname: string; readonly port: number };
  readonly host: PublicHostConfiguration;
  readonly culture: CultureOptions;
  readonly authentication: z.infer<typeof authenticationSchema>;
}

const absolutePath = z
  .string()
  .min(1)
  .refine((value) => isAbsolute(value) && normalize(value) === value && !value.includes("\0"));
const shortLongNarrow = z.enum(["short", "long", "narrow"]);
const numeric = z.enum(["numeric", "2-digit"]);
const timeZone = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });
const dateTimeFormat = z
  .object({
    year: numeric.optional(),
    month: z.enum(["numeric", "2-digit", "long", "short", "narrow"]).optional(),
    day: numeric.optional(),
    hour: numeric.optional(),
    minute: numeric.optional(),
    second: numeric.optional(),
    weekday: shortLongNarrow.optional(),
    era: shortLongNarrow.optional(),
    hour12: z.boolean().optional(),
    timeZoneName: z.enum(["long", "short"]).optional(),
    timeZone: timeZone.optional(),
    localeMatcher: z.enum(["best fit", "lookup"]).optional(),
    formatMatcher: z.enum(["best fit", "basic"]).optional(),
    dateStyle: z.enum(["full", "long", "medium", "short"]).optional(),
    timeStyle: z.enum(["full", "long", "medium", "short"]).optional(),
    hourCycle: z.enum(["h11", "h12", "h23", "h24"]).optional(),
    dayPeriod: shortLongNarrow.optional(),
  })
  .strict()
  .readonly();
const numberFormat = z
  .object({
    localeMatcher: z.enum(["best fit", "lookup"]).optional(),
    style: z.enum(["decimal", "currency", "percent", "unit"]).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/u)
      .optional(),
    currencyDisplay: z.enum(["symbol", "narrowSymbol", "code", "name"]).optional(),
    currencySign: z.enum(["standard", "accounting"]).optional(),
    unit: z.string().min(1).optional(),
    unitDisplay: z.enum(["short", "long", "narrow"]).optional(),
    useGrouping: z.boolean().optional(),
    minimumIntegerDigits: z.number().int().min(1).max(21).optional(),
    minimumFractionDigits: z.number().int().min(0).max(100).optional(),
    maximumFractionDigits: z.number().int().min(0).max(100).optional(),
    minimumSignificantDigits: z.number().int().min(1).max(21).optional(),
    maximumSignificantDigits: z.number().int().min(1).max(21).optional(),
    notation: z.enum(["standard", "scientific", "engineering", "compact"]).optional(),
    compactDisplay: z.enum(["short", "long"]).optional(),
    signDisplay: z.enum(["auto", "never", "always", "exceptZero"]).optional(),
    numberingSystem: z.string().min(1).optional(),
  })
  .strict()
  .readonly();
const formats = z
  .object({
    dateTime: z.record(z.string().min(1), dateTimeFormat).readonly().optional(),
    number: z.record(z.string().min(1), numberFormat).readonly().optional(),
    list: z
      .record(
        z.string().min(1),
        z
          .object({
            localeMatcher: z.enum(["best fit", "lookup"]).optional(),
            style: shortLongNarrow.optional(),
            type: z.enum(["conjunction", "disjunction", "unit"]).optional(),
          })
          .strict()
          .readonly(),
      )
      .readonly()
      .optional(),
    displayName: z
      .record(
        z.string().min(1),
        z
          .object({
            localeMatcher: z.enum(["best fit", "lookup"]).optional(),
            style: shortLongNarrow.optional(),
            type: z.enum(["language", "region", "script", "currency", "calendar", "dateTimeField"]),
            fallback: z.enum(["code", "none"]).optional(),
            languageDisplay: z.enum(["dialect", "standard"]).optional(),
          })
          .strict()
          .readonly(),
      )
      .readonly()
      .optional(),
  })
  .strict()
  .readonly();
const positiveBudget = z.number().int().min(1).max(2147483647);
const issuerConfigurationSchema = z
  .object({
    origin: z
      .object({
        externalBaseUrl: z.string().url(),
        cookies: z
          .object({ prefix: z.string().regex(/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/), useSecureCookies: z.boolean() })
          .strict()
          .readonly(),
        csrfSecret: z.string().min(32),
        csrfLifetimeSeconds: positiveBudget,
      })
      .strict()
      .readonly(),
    coreSecret: z.string().min(32),
    maxAgeSeconds: z
      .number()
      .int()
      .positive()
      .refine((value) => Number.isSafeInteger(value * 1000)),
    updateAgeSeconds: z.number().int().nonnegative(),
    providers: z
      .array(z.enum(["credentials", "ldap", "oidc"]))
      .min(1)
      .refine((value) => new Set(value).size === value.length)
      .readonly(),
    oidc: z
      .object({
        name: z.string().min(1),
        issuer: z.string().url(),
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        tokenEndpointAuthMethod: z.enum(["client_secret_basic", "client_secret_post", "client_secret_jwt", "none"]),
        scope: z.string().min(1),
        redirectUri: z.string().url(),
        redirectProxyUrl: z.string().url(),
        forceUserinfo: z.boolean(),
        dangerousAccountLinking: z.boolean(),
        dangerousCredentialsLinking: z.boolean(),
        nameAttribute: z.string().min(1).nullable(),
        groupsAttribute: z.string().min(1),
        groupsLocalManagement: z.boolean(),
      })
      .strict()
      .readonly()
      .nullable(),
    bodyBudget: z.object({ maximumBytes: positiveBudget }).strict().readonly(),
  })
  .strict()
  .readonly()
  .refine((value) => value.updateAgeSeconds <= value.maxAgeSeconds);
const ldapConfigurationSchema = z
  .object({
    uri: z.string().url(),
    configuration: z
      .object({
        bindDistinguishedName: z.string(),
        bindPassword: z.string(),
        base: z.string(),
        searchScope: z.enum(["base", "one", "sub"]),
        usernameAttribute: z.string().min(1),
        userMailAttribute: z.string().min(1),
        usernameFilterExtraArg: z.string().optional(),
        groupClass: z.string().min(1),
        groupMemberAttribute: z.string().min(1),
        groupMemberUserAttribute: z.string().min(1),
        groupFilterExtraArg: z.string().optional(),
      })
      .strict()
      .readonly(),
  })
  .strict()
  .readonly()
  .nullable();
const authenticatedReadSchema = z
  .object({
    kind: z.literal("authenticated-read"),
    issuer: issuerConfigurationSchema,
    ldap: ldapConfigurationSchema,
    apiKeys: z.discriminatedUnion("type", [
      z
        .object({ type: z.literal("disabled") })
        .strict()
        .readonly(),
      z
        .object({ type: z.literal("approved-stored-bcrypt-reader") })
        .strict()
        .readonly(),
    ]),
    maximumSnapshotRows: z.number().int().min(1).max(2147483646),
    maximumAbsoluteClockSkewMs: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    requestDeadlineMs: positiveBudget,
    maximumResponseBytes: positiveBudget,
    demo: z.object({ enabled: z.boolean(), readOnly: z.boolean() }).strict().readonly(),
    build: z
      .object({
        version: z
          .string()
          .min(1)
          .refine((value) => value !== "0.0.0" && value.trim() === value),
        revision: z
          .string()
          .min(1)
          .refine((value) => value.trim() === value),
      })
      .strict()
      .readonly(),
  })
  .strict()
  .readonly();
const authenticationSchema = z
  .discriminatedUnion("kind", [
    z
      .object({ kind: z.literal("public-only") })
      .strict()
      .readonly(),
    authenticatedReadSchema,
  ])
  .superRefine((value, context) => {
    if (value.kind === "public-only") return;
    if (value.issuer.providers.includes("ldap") && value.ldap === null)
      context.addIssue({ code: "custom", message: "Enabled LDAP requires real configuration", path: ["ldap"] });
    if (value.issuer.providers.includes("oidc") && value.issuer.oidc === null)
      context.addIssue({
        code: "custom",
        message: "Enabled OIDC requires real configuration",
        path: ["issuer", "oidc"],
      });
    const origin = new URL(value.issuer.origin.externalBaseUrl);
    if (
      origin.origin !== value.issuer.origin.externalBaseUrl ||
      origin.username ||
      origin.password ||
      !["http:", "https:"].includes(origin.protocol) ||
      value.issuer.origin.cookies.useSecureCookies !== (origin.protocol === "https:")
    )
      context.addIssue({
        code: "custom",
        message: "Issuer requires a canonical origin and matching secure cookies",
        path: ["issuer", "origin"],
      });
    if (
      value.issuer.oidc &&
      (value.issuer.oidc.redirectUri !== `${origin.origin}/api/auth/callback/oidc` ||
        value.issuer.oidc.redirectProxyUrl !== `${origin.origin}/api/auth`)
    )
      context.addIssue({
        code: "custom",
        message: "OIDC callback configuration must match the issuer",
        path: ["issuer", "oidc"],
      });
  });
const startupSchema = z
  .object({
    version: z.literal(1),
    authentication: authenticationSchema,
    listener: z
      .object({
        hostname: z.string().refine((value) => value === "localhost" || isIP(value) !== 0),
        port: z.number().int().min(1).max(65535),
      })
      .strict()
      .readonly(),
    host: z
      .object({
        baseUrl: z.string().transform((value): PublicHostConfiguration["baseUrl"] => {
          const origin = new URL(value);
          if (
            (origin.protocol !== "http:" && origin.protocol !== "https:") ||
            origin.origin !== value ||
            origin.username ||
            origin.password ||
            origin.pathname !== "/" ||
            origin.search ||
            origin.hash ||
            origin.hostname === "0.0.0.0" ||
            origin.hostname === "[::]" ||
            origin.hostname.includes("*")
          ) {
            throw new TypeError("Startup requires a canonical concrete public HTTP(S) origin");
          }
          if (origin.protocol === "https:") return `https://${origin.host}`;
          return `http://${origin.host}`;
        }),
        basePath: z.literal(""),
        persistence: z
          .object({
            engine: z.literal("sqlite"),
            mode: z.enum(["fresh", "existing"]),
            path: absolutePath,
            migrationsFolder: absolutePath,
            epochInitializationTimeoutMs: z.number().int().positive().max(2147483647),
          })
          .strict()
          .readonly(),
        localeMutationBodyLimit: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      })
      .strict()
      .readonly(),
    culture: z
      .object({
        timeZone: timeZone.optional(),
        formats: formats.optional(),
      })
      .strict()
      .readonly(),
  })
  .strict()
  .readonly();

let configuration: Promise<StartupConfiguration> | undefined;

export function initializeStartupConfiguration(entryUrl: string): Promise<StartupConfiguration> {
  configuration ??= Promise.resolve().then(async () => {
    const artifactRoot = await captureArtifactRoot(entryUrl);
    return readStartupConfiguration(artifactRoot);
  });
  return configuration;
}

export function loadStartupConfiguration(): Promise<StartupConfiguration> {
  if (!configuration)
    return Promise.reject(new TypeError("Startup configuration must be initialized by the owning entry"));
  return configuration;
}

async function captureArtifactRoot(entryUrl: string): Promise<string> {
  const entry = new URL(entryUrl);
  if (entry.protocol !== "file:" || entry.search || entry.hash || entry.href !== entryUrl)
    throw new TypeError("Startup requires the canonical packaged entry file URL");
  const entryPath = absolutePath.parse(fileURLToPath(entry));
  const serverDirectory = dirname(entryPath);
  if (basename(entryPath) !== "index.mjs" || basename(serverDirectory) !== "server")
    throw new TypeError("Startup requires the packaged server/index.mjs entry position");
  const artifactRoot = dirname(serverDirectory);
  await requireProtectedDirectory(artifactRoot);
  for (const sibling of ["server", "public", "db", "cli", "scripts"])
    await requireProtectedDirectory(join(artifactRoot, sibling));
  const attributes = await lstat(entryPath);
  if (
    !attributes.isFile() ||
    attributes.isSymbolicLink() ||
    attributes.nlink !== 1 ||
    (await realpath(entryPath)) !== entryPath
  ) {
    throw new TypeError("Startup requires a canonical single-link regular packaged entry file");
  }
  return artifactRoot;
}

async function requireProtectedDirectory(path: string): Promise<void> {
  const uid = process.getuid?.();
  if (uid === undefined) throw new TypeError("Startup requires a service process UID");
  let current = path;
  for (;;) {
    const attributes = await lstat(current);
    if (
      !attributes.isDirectory() ||
      attributes.isSymbolicLink() ||
      (attributes.mode & 0o022) !== 0 ||
      (attributes.uid !== uid && attributes.uid !== 0) ||
      (await realpath(current)) !== current
    ) {
      throw new TypeError("Startup requires protected canonical service or root-owned directory ancestors");
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function requirePrivateConfigurationFile(attributes: Stats): void {
  if (
    !attributes.isFile() ||
    attributes.isSymbolicLink() ||
    (attributes.mode & 0o7777) !== 0o600 ||
    attributes.uid !== process.getuid?.() ||
    attributes.nlink !== 1 ||
    attributes.size > 1048576
  ) {
    throw new TypeError("Host config must be a single-link process-owned 0600 regular file of at most 1 MiB");
  }
}

function sameFileIdentity(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function pathsOverlap(left: string, right: string): boolean {
  const child = relative(left, right);
  return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`));
}

async function readStartupConfiguration(artifactRoot: string): Promise<StartupConfiguration> {
  const argumentsForConfiguration = process.argv.filter((argument) => argument.startsWith("--homarr-host-config="));
  if (argumentsForConfiguration.length !== 1)
    throw new TypeError("Exactly one explicit host config argument is required");
  const path = absolutePath.parse(argumentsForConfiguration[0]?.slice("--homarr-host-config=".length));
  if (pathsOverlap(artifactRoot, path)) throw new TypeError("Host config must be outside the packaged artifact root");
  await requireProtectedDirectory(dirname(path));
  if ((await realpath(path)) !== path) throw new TypeError("Host config must not use symbolic links");
  const pathAttributes = await lstat(path);
  requirePrivateConfigurationFile(pathAttributes);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let parsed: StartupConfiguration;
  try {
    const attributes = await file.stat();
    requirePrivateConfigurationFile(attributes);
    if (!sameFileIdentity(pathAttributes, attributes))
      throw new TypeError("Host config identity changed before reading");
    const buffer = Buffer.alloc(1048577);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > 1048576) throw new TypeError("Host config exceeds 1 MiB");
    const finalAttributes = await file.stat();
    const finalPathAttributes = await lstat(path);
    requirePrivateConfigurationFile(finalAttributes);
    requirePrivateConfigurationFile(finalPathAttributes);
    if (
      length !== attributes.size ||
      !sameFileIdentity(attributes, finalAttributes) ||
      !sameFileIdentity(attributes, finalPathAttributes) ||
      (await realpath(path)) !== path
    ) {
      throw new TypeError("Host config identity changed during reading");
    }
    const input: unknown = JSON.parse(buffer.toString("utf8", 0, length));
    const validated = startupSchema.parse(input);
    parsed = Object.freeze({ ...validated, host: captureHostConfiguration(validated.host) });
  } catch (error) {
    try {
      await file.close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Host config reading and cleanup failed", { cause: error });
    }
    throw error;
  }
  await file.close();
  if (
    parsed.authentication.kind === "authenticated-read" &&
    parsed.authentication.issuer.origin.externalBaseUrl !== parsed.host.baseUrl
  )
    throw new TypeError("Authentication origin must match the explicit host origin");
  const databasePath = parsed.host.persistence.path;
  const migrationsFolder = parsed.host.persistence.migrationsFolder;
  const databaseDirectory = dirname(databasePath);
  await requireProtectedDirectory(databaseDirectory);
  await requireProtectedDirectory(migrationsFolder);
  if (
    [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`].includes(path) ||
    pathsOverlap(migrationsFolder, path) ||
    pathsOverlap(migrationsFolder, databasePath) ||
    pathsOverlap(databaseDirectory, migrationsFolder) ||
    pathsOverlap(artifactRoot, databaseDirectory) ||
    pathsOverlap(databaseDirectory, artifactRoot)
  ) {
    throw new TypeError("Host config, database sidecars, packaged artifact and migration assets must not collide");
  }
  let databaseAttributes: Stats;
  try {
    databaseAttributes = await lstat(databasePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      if (parsed.host.persistence.mode === "fresh") return parsed;
      throw new TypeError("Existing startup requires a present database path");
    }
    throw error;
  }
  if (parsed.host.persistence.mode === "fresh") throw new TypeError("Fresh startup refuses an existing database path");
  if (
    !databaseAttributes.isFile() ||
    databaseAttributes.isSymbolicLink() ||
    databaseAttributes.nlink !== 1 ||
    (databaseAttributes.mode & 0o022) !== 0 ||
    (databaseAttributes.uid !== process.getuid?.() && databaseAttributes.uid !== 0) ||
    (await realpath(databasePath)) !== databasePath
  ) {
    throw new TypeError("Existing startup requires a protected single-link canonical regular database file");
  }
  return parsed;
}
