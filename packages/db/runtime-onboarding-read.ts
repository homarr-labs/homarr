import { Buffer } from "node:buffer";
import { createHash, timingSafeEqual } from "node:crypto";
import { TextDecoder } from "node:util";
import type { Database, Statement } from "bun:sqlite";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import { everyoneGroup } from "@homarr/definitions";
import type { SupportedAuthProvider } from "@homarr/definitions";

import type { CopiedSqlValue } from "./copied-sqlite";
import type {
  NativeCredentialEvidence,
  NativeCredentialPolicyConfiguration,
} from "./runtime-auth-credential/contracts";
import { nativeCredentialPolicyStatements } from "./runtime-auth-credential/statements";
import {
  authCredentialProvider,
  authCredentialTimestamp,
  captureNativeCredentialEvidence,
  captureNativeCredentialPolicyConfiguration,
  requireAuthCredentialClock,
} from "./runtime-auth-credential/validation";
import type { OnboardingOperation } from "./runtime-onboarding/contracts";
import { assertEpoch } from "./runtime-state/validation";

export type OnboardingCoreReadSelection = "current-step" | "environment";

export type OnboardingCoreReadAuthority =
  | { readonly kind: "anonymous"; readonly claimToken: string | null }
  | { readonly kind: "credential"; readonly credential: NativeCredentialEvidence };

export interface OnboardingCoreReadConfiguration extends NativeCredentialPolicyConfiguration {
  readonly version: string;
  readonly enabledProviders: readonly SupportedAuthProvider[];
  readonly serverOrigin: string;
  readonly dockerEnabled: boolean;
  readonly kubernetesEnabled: boolean;
  readonly workshopApiUrl: string;
  readonly workshopUrl: string;
  readonly maximumResponseBytes: number;
}

export interface OnboardingCoreReadStep {
  readonly step: string | null;
  readonly previousStep: string | null;
}

export interface OnboardingCoreReadBoard {
  readonly id: string;
  readonly name: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
}

export interface OnboardingCoreReadEnvironment {
  readonly version: string;
  readonly currentStep: string | null;
  readonly databaseDriver: "sqlite";
  readonly externalAuthEnabled: boolean;
  readonly dockerConfigured: boolean;
  readonly kubernetesConfigured: boolean;
  readonly workshopApiUrl: string;
  readonly workshopUrl: string;
  readonly serverOrigin: string;
  readonly mcpEndpoint: string;
  readonly canConfigurePrivileged: boolean;
  readonly hasUsers: boolean;
  readonly initialBoard: OnboardingCoreReadBoard | null;
  readonly availableBoards: readonly { readonly id: string; readonly name: string }[];
}

export interface OnboardingCoreReadBounds {
  readonly deadlineAt: number;
  readonly monotonicExpiresAt: number;
  readonly lastMonotonicAt: number;
}

export type OnboardingCoreReadResult =
  | {
      readonly selection: "current-step";
      readonly current: OnboardingCoreReadStep;
      readonly bounds: OnboardingCoreReadBounds;
    }
  | {
      readonly selection: "environment";
      readonly current: OnboardingCoreReadStep;
      readonly environment: OnboardingCoreReadEnvironment;
      readonly bounds: OnboardingCoreReadBounds;
    };

export class OnboardingCoreReadError extends Error {
  readonly retryable = false;

  constructor(readonly code: "ONBOARDING_CORE_UNAVAILABLE" | "ONBOARDING_CORE_OVERFLOW") {
    super(code);
    this.name = "OnboardingCoreReadError";
  }
}

const unavailable = (): never => {
  throw new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE");
};

const overflow = (): never => {
  throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
};

const record = (input: unknown): Record<string, unknown> => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return unavailable();
  if (Object.getOwnPropertySymbols(input).length !== 0) return unavailable();
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (!("value" in descriptor)) return unavailable();
    Object.defineProperty(result, key, { value: descriptor.value, enumerable: true });
  }
  return result;
};

const exact = (input: unknown, keys: readonly string[]): Record<string, unknown> => {
  const value = record(input);
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) return unavailable();
  return value;
};

const text = (input: unknown, units: number, bytes: number): string => {
  if (typeof input !== "string" || !input.isWellFormed() || input.includes("\u0000")) return unavailable();
  if (input.length > units || Buffer.byteLength(input, "utf8") > bytes) return overflow();
  return input;
};

const integer = (input: unknown): number => {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0) return unavailable();
  return input;
};

const signed = (input: unknown): bigint => {
  if (typeof input !== "string" || input.length > 20 || !/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(input))
    return unavailable();
  const value = BigInt(input);
  if (value < -9223372036854775808n || value > 9223372036854775807n || value.toString() !== input) return unavailable();
  return value;
};

const boolean = (input: unknown): boolean => {
  if (typeof input !== "boolean") return unavailable();
  return input;
};

const httpUrl = (input: unknown): string => {
  const value = text(input, 4096, 4096);
  if (!value || value.trim() !== value) return unavailable();
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 32 || unit === 127) return unavailable();
  }
  const url = new URL(value);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash)
    return unavailable();
  return value;
};

const providers = (input: unknown): readonly SupportedAuthProvider[] => {
  if (!Array.isArray(input)) return unavailable();
  const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
  if (!lengthDescriptor || !("value" in lengthDescriptor)) return unavailable();
  const count = integer(lengthDescriptor.value);
  if (count < 1 || count > 3 || Reflect.ownKeys(input).length !== count + 1) return unavailable();
  const values: SupportedAuthProvider[] = [];
  for (let index = 0; index < count; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !("value" in descriptor)) return unavailable();
    const value = authCredentialProvider(descriptor.value);
    if (values.includes(value)) return unavailable();
    values.push(value);
  }
  return Object.freeze(values);
};

export const captureOnboardingCoreRead = (
  input: OnboardingOperation,
  selection: OnboardingCoreReadSelection,
  authorityInput: OnboardingCoreReadAuthority,
  configurationInput: OnboardingCoreReadConfiguration,
) => {
  const source = exact(input, [
    "signal",
    "lifetime",
    "deadlineAt",
    "originalWallStartedAt",
    "originalMonotonicStartedAt",
    "originalBudgetMs",
    "originalMonotonicExpiresAt",
  ]);
  const { signal, lifetime } = source;
  if (!(signal instanceof AbortSignal) || !(lifetime instanceof AbortSignal)) return unavailable();
  const deadlineAt = integer(source.deadlineAt);
  const originalWallStartedAt = integer(source.originalWallStartedAt);
  const originalBudgetMs = integer(source.originalBudgetMs);
  const { originalMonotonicStartedAt, originalMonotonicExpiresAt } = source;
  if (
    typeof originalMonotonicStartedAt !== "number" ||
    !Number.isFinite(originalMonotonicStartedAt) ||
    originalMonotonicStartedAt < 0 ||
    typeof originalMonotonicExpiresAt !== "number" ||
    !Number.isFinite(originalMonotonicExpiresAt) ||
    originalMonotonicExpiresAt !== originalMonotonicStartedAt + originalBudgetMs ||
    originalBudgetMs < 1 ||
    originalBudgetMs > 10_000 ||
    !Number.isSafeInteger(originalWallStartedAt + originalBudgetMs) ||
    deadlineAt <= originalWallStartedAt ||
    deadlineAt > originalWallStartedAt + originalBudgetMs
  )
    return unavailable();
  if (selection !== "current-step" && selection !== "environment") return unavailable();
  const operation: OnboardingOperation = Object.freeze({
    signal,
    lifetime,
    deadlineAt,
    originalWallStartedAt,
    originalMonotonicStartedAt,
    originalBudgetMs,
    originalMonotonicExpiresAt,
  });
  const sourceAuthority = record(authorityInput);
  let authority: OnboardingCoreReadAuthority;
  if (sourceAuthority.kind === "anonymous") {
    exact(authorityInput, ["kind", "claimToken"]);
    let claimToken: string | null = null;
    if (sourceAuthority.claimToken !== null) claimToken = text(sourceAuthority.claimToken, 512, 512);
    if (claimToken === "") return unavailable();
    authority = Object.freeze({ kind: "anonymous", claimToken });
  } else {
    exact(authorityInput, ["kind", "credential"]);
    if (sourceAuthority.kind !== "credential") return unavailable();
    const credential = record(sourceAuthority.credential);
    const keys = ["type", "namespace", "lifetimeSequence", "writeSequence", "userId", "provider"];
    if (credential.type === "opaque-session") keys.push("token", "expiresAt", "hostDeadlineAt");
    else if (credential.type === "api-key") keys.push("id", "hash");
    else return unavailable();
    exact(sourceAuthority.credential, keys);
    const captured = captureNativeCredentialEvidence({
      namespace: text(credential.namespace, 36, 144),
      lifetimeSequence: text(credential.lifetimeSequence, 19, 19),
      writeSequence: text(credential.writeSequence, 19, 19),
      userId: text(credential.userId, 64, 256),
      provider: authCredentialProvider(credential.provider),
      ...credentialLocator(credential),
    });
    authority = Object.freeze({ kind: "credential", credential: captured });
  }
  const options = exact(configurationInput, [
    "maximumSnapshotRows",
    "maximumAbsoluteClockSkewMs",
    "now",
    "version",
    "enabledProviders",
    "serverOrigin",
    "dockerEnabled",
    "kubernetesEnabled",
    "workshopApiUrl",
    "workshopUrl",
    "maximumResponseBytes",
  ]);
  const maximumAbsoluteClockSkewMs = integer(options.maximumAbsoluteClockSkewMs);
  if (maximumAbsoluteClockSkewMs > 1000 || typeof options.now !== "function") return unavailable();
  const now = options.now;
  const policy = captureNativeCredentialPolicyConfiguration({
    maximumSnapshotRows: integer(options.maximumSnapshotRows),
    maximumAbsoluteClockSkewMs,
    now: () => authCredentialTimestamp(now()),
  });
  const version = text(options.version, 256, 256);
  if (!version || version.trim() !== version || version === "0.0.0") return unavailable();
  const serverOrigin = httpUrl(options.serverOrigin);
  if (new URL(serverOrigin).origin !== serverOrigin) return unavailable();
  const maximumResponseBytes = integer(options.maximumResponseBytes);
  if (maximumResponseBytes < 1) return unavailable();
  const configuration: OnboardingCoreReadConfiguration = Object.freeze({
    ...policy,
    version,
    enabledProviders: providers(options.enabledProviders),
    serverOrigin,
    dockerEnabled: boolean(options.dockerEnabled),
    kubernetesEnabled: boolean(options.kubernetesEnabled),
    workshopApiUrl: httpUrl(options.workshopApiUrl),
    workshopUrl: httpUrl(options.workshopUrl),
    maximumResponseBytes,
  });
  text(`${serverOrigin}/api/mcp`, 4096, 4096);
  return Object.freeze({ operation, selection, authority, configuration });
};

type CredentialLocator =
  | {
      readonly type: "opaque-session";
      readonly token: string;
      readonly expiresAt: number;
      readonly hostDeadlineAt: number;
    }
  | { readonly type: "api-key"; readonly id: string; readonly hash: string };

const credentialLocator = (value: Record<string, unknown>): CredentialLocator => {
  if (value.type === "opaque-session")
    return {
      type: "opaque-session",
      token: text(value.token, 512, 2048),
      expiresAt: authCredentialTimestamp(value.expiresAt),
      hostDeadlineAt: authCredentialTimestamp(value.hostDeadlineAt),
    };
  if (value.type !== "api-key") return unavailable();
  return { type: "api-key", id: text(value.id, 64, 256), hash: text(value.hash, 512, 2048) };
};

export type CapturedOnboardingCoreRead = ReturnType<typeof captureOnboardingCoreRead>;

export class OnboardingCoreReadClock {
  private lastWall: number;
  private lastMonotonic: number;
  private lastNative = 0;
  private deadlineAt: number;
  private monotonicExpiresAt: number;

  constructor(
    private readonly captured: CapturedOnboardingCoreRead,
    private readonly ownerLifetime: AbortSignal,
  ) {
    const { operation } = captured;
    this.lastWall = operation.originalWallStartedAt;
    this.lastMonotonic = operation.originalMonotonicStartedAt;
    this.deadlineAt = operation.deadlineAt;
    this.monotonicExpiresAt = Math.min(
      operation.originalMonotonicExpiresAt,
      operation.originalMonotonicStartedAt + (operation.deadlineAt - operation.originalWallStartedAt),
    );
    if (captured.authority.kind === "credential" && captured.authority.credential.type === "opaque-session") {
      const credential = captured.authority.credential;
      this.tighten(
        Math.min(credential.hostDeadlineAt, credential.expiresAt - captured.configuration.maximumAbsoluteClockSkewMs),
      );
    }
    this.check();
  }

  check(): number {
    const { operation, configuration } = this.captured;
    this.ownerLifetime.throwIfAborted();
    operation.signal.throwIfAborted();
    operation.lifetime.throwIfAborted();
    const wall = requireAuthCredentialClock(Date.now(), configuration);
    const configured = requireAuthCredentialClock(configuration.now(), configuration);
    const monotonic = performance.now();
    if (wall < this.lastWall || !Number.isFinite(monotonic) || monotonic < this.lastMonotonic) return unavailable();
    this.lastWall = wall;
    this.lastMonotonic = monotonic;
    const now = Math.max(wall, configured);
    const remaining = Math.min(
      operation.originalWallStartedAt + operation.originalBudgetMs - now,
      operation.originalMonotonicExpiresAt - monotonic,
      this.deadlineAt - now,
      this.monotonicExpiresAt - monotonic,
    );
    if (!Number.isFinite(remaining) || remaining < 1) return unavailable();
    return Math.min(2147483647, Math.floor(remaining));
  }

  tighten(deadline: number): void {
    const { operation } = this.captured;
    if (!Number.isSafeInteger(deadline)) return unavailable();
    this.deadlineAt = Math.min(this.deadlineAt, deadline);
    this.monotonicExpiresAt = Math.min(
      this.monotonicExpiresAt,
      operation.originalMonotonicExpiresAt,
      operation.originalMonotonicStartedAt + (deadline - operation.originalWallStartedAt),
    );
    this.check();
  }

  observeNative(input: unknown, before: number): number {
    this.check();
    const observed = signed(input);
    if (observed < 0n || observed > 8640000000000000n) return unavailable();
    const value = requireAuthCredentialClock(Number(observed), this.captured.configuration);
    const skew = this.captured.configuration.maximumAbsoluteClockSkewMs;
    if (value < this.lastNative || value < before - skew || value > Date.now() + skew) return unavailable();
    this.lastNative = value;
    this.check();
    return value;
  }

  bounds(): OnboardingCoreReadBounds {
    this.check();
    return Object.freeze({
      deadlineAt: this.deadlineAt,
      monotonicExpiresAt: this.monotonicExpiresAt,
      lastMonotonicAt: this.lastMonotonic,
    });
  }
}

interface Field {
  readonly name: string;
  readonly kind: "text" | "integer";
  readonly units: number;
  readonly bytes: number;
  readonly nullable?: boolean;
}

class ProjectionBudget {
  private raw = 0;
  private framed = 0;
  private serialized = 65_536;

  constructor(private readonly maximumResponseBytes: number) {
    if (this.serialized > Math.min(8 * 1024 * 1024, maximumResponseBytes)) overflow();
  }

  charge(bytes: number): void {
    this.raw += bytes;
    this.framed += bytes + 32;
    this.serialized += bytes * 6 + 128;
    if (
      !Number.isSafeInteger(this.raw) ||
      this.raw > 2 * 1024 * 1024 ||
      this.framed > 4 * 1024 * 1024 ||
      this.serialized > Math.min(8 * 1024 * 1024, this.maximumResponseBytes)
    )
      return overflow();
  }
}

const eraseRow = (input: unknown, failed: (error: unknown) => void, quarantine: (error: unknown) => void): void => {
  if (typeof input !== "object" || input === null) return;
  const cleanupFailed = (error: unknown) => {
    failed(error);
    try {
      quarantine(error);
    } catch (cause) {
      failed(cause);
    }
  };
  let keys: (string | symbol)[];
  try {
    keys = Reflect.ownKeys(input);
  } catch (error) {
    cleanupFailed(error);
    return;
  }
  for (const key of keys) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor && "value" in descriptor && descriptor.value instanceof Uint8Array)
        Uint8Array.prototype.fill.call(descriptor.value, 0);
    } catch (error) {
      cleanupFailed(error);
    }
  }
};

class CoreReader {
  private encoding: "UTF-8" | "UTF-16le" | "UTF-16be" | undefined;
  private decoder: TextDecoder | undefined;

  constructor(
    private readonly client: Database,
    private readonly clock: OnboardingCoreReadClock,
    private readonly assertCurrent: () => void,
    private readonly quarantine: (error: unknown) => void,
    private readonly inTransaction = true,
  ) {}

  check = (): void => {
    this.clock.check();
    this.assertCurrent();
    if (this.client.inTransaction !== this.inTransaction) return unavailable();
  };

  each(query: string, bindings: CopiedSqlValue[], visit: (row: Record<string, unknown>) => void): void {
    this.check();
    let statement: Statement<unknown, CopiedSqlValue[]> | undefined;
    let iterator: IterableIterator<unknown> | undefined;
    const errors: unknown[] = [];
    const failed = (error: unknown) => {
      if (!errors.includes(error)) errors.push(error);
    };
    const nativeFailed = (error: unknown) => {
      failed(error);
      try {
        this.quarantine(error);
      } catch (cause) {
        failed(cause);
      }
    };
    try {
      try {
        statement = this.client.prepare<unknown, CopiedSqlValue[]>(query);
      } catch (error) {
        nativeFailed(error);
        throw error;
      }
      this.check();
      try {
        iterator = statement.iterate(...bindings);
      } catch (error) {
        nativeFailed(error);
        throw error;
      }
      this.check();
      for (;;) {
        this.check();
        let step: IteratorResult<unknown>;
        try {
          step = iterator.next();
        } catch (error) {
          nativeFailed(error);
          throw error;
        }
        const row = step.value;
        try {
          this.check();
          if (step.done) break;
          visit(record(row));
          this.check();
        } catch (error) {
          failed(error);
        } finally {
          eraseRow(row, failed, this.quarantine);
        }
        if (errors.length > 0) break;
      }
    } catch (error) {
      failed(error);
    } finally {
      try {
        this.check();
      } catch (error) {
        failed(error);
      }
      try {
        iterator?.return?.();
      } catch (error) {
        nativeFailed(error);
      }
      try {
        this.check();
      } catch (error) {
        failed(error);
      }
      try {
        statement?.finalize();
      } catch (error) {
        nativeFailed(error);
      }
      try {
        this.check();
      } catch (error) {
        failed(error);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1)
      throw new AggregateError(errors, "CORE native read and cleanup failed", { cause: errors[0] });
  }

  initialize(): void {
    this.check();
    this.encoding = undefined;
    this.decoder = undefined;
    let count = 0;
    const observed: { encoding: "UTF-8" | "UTF-16le" | "UTF-16be" | undefined } = { encoding: undefined };
    this.each("PRAGMA main.encoding", [], (row) => {
      count += 1;
      if (count > 1) return unavailable();
      const value = row.encoding;
      if (value !== "UTF-8" && value !== "UTF-16le" && value !== "UTF-16be") return unavailable();
      observed.encoding = value;
    });
    const encoding = observed.encoding;
    if (count !== 1 || encoding === undefined) return unavailable();
    let label: string;
    if (encoding === "UTF-8") label = "utf-8";
    else if (encoding === "UTF-16le") label = "utf-16le";
    else if (encoding === "UTF-16be") label = "utf-16be";
    else return unavailable();
    this.check();
    const decoder = new TextDecoder(label, { fatal: true, ignoreBOM: true });
    this.check();
    if (decoder.encoding !== label || decoder.fatal !== true || decoder.ignoreBOM !== true) return unavailable();
    this.encoding = encoding;
    this.decoder = decoder;
    this.check();
  }

  private decodeNativeText(value: unknown, field: Field, nativeBytes: number): string {
    this.check();
    if (
      !this.decoder ||
      this.encoding === undefined ||
      !(value instanceof Uint8Array) ||
      value.byteLength !== nativeBytes
    )
      return unavailable();
    if (nativeBytes > field.bytes) return overflow();
    let utf8Bound = nativeBytes;
    if (this.encoding !== "UTF-8") {
      if (nativeBytes % 2 !== 0) return unavailable();
      utf8Bound *= 3;
    }
    if (utf8Bound > field.bytes) return overflow();
    this.check();
    const decoded = this.decoder.decode(value, { stream: false });
    this.check();
    const result = text(decoded, field.units, field.bytes);
    this.check();
    return result;
  }

  preflight(
    query: string,
    bindings: CopiedSqlValue[],
    fields: readonly Field[],
    maximumRows: number,
    budget?: ProjectionBudget,
  ): number {
    let count = 0;
    const metadata = fields
      .flatMap((field, index) => [
        `typeof("${field.name}") AS "t${index}"`,
        `length(CAST("${field.name}" AS BLOB)) AS "b${index}"`,
        `CASE WHEN typeof("${field.name}") = 'integer' THEN CAST("${field.name}" AS TEXT) ELSE NULL END AS "i${index}"`,
      ])
      .join(", ");
    this.each(`SELECT ${metadata} FROM (${query}) AS core_source`, bindings, (row) => {
      count += 1;
      if (count > maximumRows) return overflow();
      for (const [index, field] of fields.entries()) {
        this.check();
        const storage = row[`t${index}`];
        if (storage === "null" && field.nullable) {
          if (row[`b${index}`] !== null || row[`i${index}`] !== null) return unavailable();
          budget?.charge(0);
          continue;
        }
        if (storage !== field.kind) return unavailable();
        const rawBytes = integer(row[`b${index}`]);
        if (rawBytes > field.bytes) return overflow();
        let bytes = rawBytes;
        if (field.kind === "integer") {
          const value = signed(row[`i${index}`]);
          if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return unavailable();
        } else {
          if (row[`i${index}`] !== null) return unavailable();
          if (this.encoding === undefined) return unavailable();
          if (this.encoding !== "UTF-8") bytes *= 3;
          if (bytes > field.bytes) return overflow();
        }
        budget?.charge(bytes);
      }
    });
    return count;
  }

  payload(
    query: string,
    bindings: CopiedSqlValue[],
    fields: readonly Field[],
    maximumRows: number,
    count: number,
  ): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const columns: string[] = [];
    const keys = new Set<string>();
    for (const [index, field] of fields.entries()) {
      this.check();
      if (keys.has(field.name)) return unavailable();
      keys.add(field.name);
      if (field.kind === "text") {
        const storageKey = `__core_t${index}`;
        const lengthKey = `__core_b${index}`;
        if (keys.has(storageKey) || keys.has(lengthKey)) return unavailable();
        keys.add(storageKey);
        keys.add(lengthKey);
        columns.push(
          `CAST(core_source."${field.name}" AS BLOB) AS "${field.name}"`,
          `typeof(core_source."${field.name}") AS "${storageKey}"`,
          `length(CAST(core_source."${field.name}" AS BLOB)) AS "${lengthKey}"`,
        );
      } else columns.push(`core_source."${field.name}" AS "${field.name}"`);
    }
    this.check();
    this.each(`SELECT ${columns.join(", ")} FROM (${query}) AS core_source`, bindings, (row) => {
      const names = Object.keys(row);
      if (
        rows.length >= maximumRows ||
        rows.length >= count ||
        names.length !== keys.size ||
        names.some((name) => !keys.has(name))
      )
        return unavailable();
      const copy: Record<string, unknown> = {};
      for (const [index, field] of fields.entries()) {
        this.check();
        const value = row[field.name];
        if (field.kind === "text") {
          const storage = row[`__core_t${index}`];
          const length = row[`__core_b${index}`];
          if (storage === "null" && field.nullable) {
            if (value !== null || length !== null) return unavailable();
            copy[field.name] = null;
          } else {
            if (storage !== "text") return unavailable();
            copy[field.name] = this.decodeNativeText(value, field, integer(length));
          }
        } else if (value === null && field.nullable) copy[field.name] = null;
        else copy[field.name] = integer(value);
      }
      rows.push(copy);
    });
    if (rows.length !== count) return unavailable();
    this.check();
    return rows;
  }

  rows(
    query: string,
    bindings: CopiedSqlValue[],
    fields: readonly Field[],
    maximumRows: number,
  ): Record<string, unknown>[] {
    const count = this.preflight(query, bindings, fields, maximumRows);
    return this.payload(query, bindings, fields, maximumRows, count);
  }

  nativeNow(): number {
    const before = Date.now();
    let count = 0;
    let value: unknown;
    this.each(
      "SELECT CAST(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER) AS TEXT) AS observed_now",
      [],
      (row) => {
        count += 1;
        value = row.observed_now;
      },
    );
    if (count !== 1) return unavailable();
    return this.clock.observeNative(value, before);
  }
}

const textField = (name: string, units: number, bytes: number, nullable = false): Field => ({
  name,
  kind: "text",
  units,
  bytes,
  nullable,
});
const numberField = (name: string, nullable = false): Field => ({
  name,
  kind: "integer",
  units: 20,
  bytes: 20,
  nullable,
});

export const assertOnboardingCoreLedgerTransfer = (
  client: Database,
  clock: OnboardingCoreReadClock,
  assertCurrent: () => void,
  quarantine: (error: unknown) => void,
): void => {
  const reader = new CoreReader(client, clock, assertCurrent, quarantine);
  let count = 0;
  reader.each(
    `SELECT typeof(hash) AS hash_storage, length(CAST(hash AS BLOB)) AS hash_bytes,
      typeof(created_at) AS time_storage, CASE typeof(created_at)
        WHEN 'integer' THEN length(CAST(created_at AS TEXT)) WHEN 'real' THEN 8
        WHEN 'null' THEN 0 ELSE length(CAST(created_at AS BLOB)) END AS time_bytes
      FROM main.__drizzle_migrations NOT INDEXED LIMIT 52`,
    [],
    (row) => {
      count += 1;
      if (count > 51 || row.hash_storage !== "text") return unavailable();
      if (integer(row.hash_bytes) > 256) return overflow();
      const storage = row.time_storage;
      if (storage !== "integer" && storage !== "real" && storage !== "null" && storage !== "text" && storage !== "blob")
        return unavailable();
      const bytes = integer(row.time_bytes);
      if (
        bytes > 512 ||
        (storage === "integer" && bytes > 20) ||
        (storage === "real" && bytes !== 8) ||
        (storage === "null" && bytes !== 0)
      )
        return overflow();
    },
  );
};

const epochFields = [textField("epoch", 36, 144)];
const stepFields = [textField("id", 64, 256), textField("step", 64, 256), textField("previousStep", 64, 256, true)];
const boardFields = [
  textField("id", 255, 1020),
  textField("name", 255, 1020),
  textField("primaryColor", 7, 28),
  textField("secondaryColor", 7, 28),
];
const boardQuery = `SELECT id, name, primary_color AS primaryColor, secondary_color AS secondaryColor
  FROM main.board NOT INDEXED ORDER BY id COLLATE BINARY LIMIT 4097`;
const stepQuery = "SELECT id, step, previous_step AS previousStep FROM main.onboarding NOT INDEXED LIMIT 2";
const homeQuery = 'SELECT home_board_id AS homeBoardId FROM main."group" WHERE name = ? LIMIT 2';
const policyFields: readonly Field[] = [
  textField("domain_id", 20, 20),
  textField("namespace", 36, 144),
  textField("phase", 12, 48),
  textField("head_sequence", 19, 19),
  textField("head_storage", 12, 48),
  textField("domain_count", 19, 19),
  textField("lifetime_sequence", 19, 19, true),
  textField("write_sequence", 19, 19, true),
  textField("lifetime_storage", 12, 48),
  textField("write_storage", 12, 48),
  textField("stored_user_id", 64, 256, true),
  textField("user_id", 64, 256, true),
  textField("provider", 512, 2048, true),
  textField("locator", 512, 2048, true),
  textField("credential_hash", 512, 2048, true),
  numberField("expires_at", true),
  numberField("expiry_matches", true),
  textField("expiry_storage", 12, 48, true),
  numberField("observed_now"),
  textField("group_id", 64, 256, true),
  textField("group_parent_id", 64, 256, true),
  textField("permission_group_id", 64, 256, true),
  textField("permission", 512, 2048, true),
];

const single = (rows: readonly Record<string, unknown>[]): Record<string, unknown> => {
  const value = rows[0];
  if (rows.length !== 1 || !value) return unavailable();
  return value;
};

const binding = (input: unknown): CopiedSqlValue => {
  if (input === null || typeof input === "string" || typeof input === "bigint") return input;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  return unavailable();
};

const fingerprint = (rows: readonly Record<string, unknown>[], check: () => void, omitClock = false): Buffer => {
  const digest = createHash("sha256");
  for (const row of rows) {
    check();
    digest.update("[");
    for (const key of Object.keys(row).sort()) {
      check();
      if (omitClock && key === "observed_now") continue;
      digest.update(JSON.stringify(key));
      const value: unknown = row[key];
      if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
        return unavailable();
      digest.update(JSON.stringify(value));
    }
    digest.update("]");
  }
  check();
  return digest.digest();
};

const policy = (reader: CoreReader, captured: CapturedOnboardingCoreRead) => {
  if (captured.authority.kind !== "credential") return { admin: false, witness: Buffer.alloc(0) };
  const statements = nativeCredentialPolicyStatements("sqlite", captured.authority.credential, captured.configuration);
  let step = statements.next();
  const dialect = new SQLiteSyncDialect();
  const observations: Record<string, unknown>[] = [];
  while (!step.done) {
    reader.check();
    const query = dialect.sqlToQuery(step.value);
    const parameters: readonly unknown[] = query.params;
    const rows = reader.rows(
      query.sql,
      parameters.map(binding),
      policyFields,
      captured.configuration.maximumSnapshotRows,
    );
    for (const row of rows) observations.push(row);
    reader.check();
    step = statements.next(rows);
  }
  reader.check();
  if (step.value.userId !== captured.authority.credential.userId) return unavailable();
  if (!captured.configuration.enabledProviders.includes(captured.authority.credential.provider)) return unavailable();
  return { admin: step.value.permissions.includes("admin"), witness: fingerprint(observations, reader.check, true) };
};

interface Claim {
  readonly raw: string | null;
  readonly allowed: boolean;
  readonly expiresAt: number | null;
}

const claim = (reader: CoreReader, captured: CapturedOnboardingCoreRead, hasUsers: boolean): Claim => {
  if (captured.authority.kind !== "anonymous" || hasUsers || captured.authority.claimToken === null)
    return { raw: null, allowed: false, expiresAt: null };
  const rows = reader.rows(
    "SELECT value FROM main.serverSetting WHERE setting_key = '__onboarding_claim' LIMIT 2",
    [],
    [textField("value", 4096, 4096)],
    1,
  );
  const value = rows[0];
  if (!value) return { raw: null, allowed: false, expiresAt: null };
  const raw = text(value.value, 4096, 4096);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return unavailable();
  }
  const data = record(parsed);
  if (typeof data.hash !== "string" || !/^[0-9a-f]{64}$/.test(data.hash)) return unavailable();
  const expiresAt = authCredentialTimestamp(data.expiresAt);
  if (expiresAt < 0) return unavailable();
  const expected = Buffer.from(data.hash, "hex");
  const actual = createHash("sha256").update(captured.authority.claimToken).digest();
  let matches = false;
  try {
    matches = timingSafeEqual(expected, actual);
  } finally {
    expected.fill(0);
    actual.fill(0);
  }
  const now = reader.nativeNow();
  return { raw, allowed: matches && expiresAt > now, expiresAt };
};

const hasUsers = (reader: CoreReader): boolean => {
  const row = single(
    reader.rows("SELECT EXISTS(SELECT 1 FROM main.user) AS hasUsers", [], [numberField("hasUsers")], 1),
  );
  if (row.hasUsers !== 0 && row.hasUsers !== 1) return unavailable();
  return row.hasUsers === 1;
};

interface CoreObservation {
  readonly epoch: string;
  readonly steps: Record<string, unknown>[];
  readonly users: boolean;
  readonly admin: boolean;
  readonly claimValue: Claim;
  readonly allowed: boolean;
  readonly homes: Record<string, unknown>[];
  readonly boards: Record<string, unknown>[];
  readonly credentialWitness: Buffer;
}

export class OnboardingCoreReadBody {
  private readonly reader: CoreReader;
  private witness: Buffer | undefined;
  private credentialWitness: Buffer | undefined;
  private epoch: string | undefined;
  private result: OnboardingCoreReadResult | undefined;
  private complete = false;

  constructor(
    private readonly client: Database,
    private readonly captured: CapturedOnboardingCoreRead,
    private readonly clock: OnboardingCoreReadClock,
    private readonly assertCurrent: () => void,
    private readonly quarantine: (error: unknown) => void,
  ) {
    this.reader = new CoreReader(client, clock, assertCurrent, quarantine);
  }

  private observe(charge: boolean): CoreObservation {
    const { reader, captured } = this;
    reader.check();
    reader.nativeNow();
    const epoch = assertEpoch(
      single(reader.rows("SELECT epoch FROM main.homarr_runtime_meta WHERE id = 1 LIMIT 2", [], epochFields, 1)).epoch,
    );
    const budget = new ProjectionBudget(captured.configuration.maximumResponseBytes);
    let projectionBudget: ProjectionBudget | undefined;
    if (charge) projectionBudget = budget;
    const users = hasUsers(reader);
    const credential = policy(reader, captured);
    try {
      const admin = credential.admin;
      const claimValue = claim(reader, captured, users);
      const allowed = admin || claimValue.allowed;
      if (claimValue.allowed && claimValue.expiresAt !== null)
        this.clock.tighten(claimValue.expiresAt - captured.configuration.maximumAbsoluteClockSkewMs);
      let homes: Record<string, unknown>[] = [];
      let boards: Record<string, unknown>[] = [];
      if (captured.selection === "environment") {
        const configuration = captured.configuration;
        const strings = [configuration.version, configuration.serverOrigin, `${configuration.serverOrigin}/api/mcp`];
        if (allowed) strings.push(configuration.workshopApiUrl, configuration.workshopUrl);
        for (const value of strings) projectionBudget?.charge(Buffer.byteLength(value, "utf8"));
      }
      const stepCount = reader.preflight(stepQuery, [], stepFields, 1, projectionBudget);
      const homeFields = [textField("homeBoardId", 255, 1020, true)];
      let homeCount = 0;
      let boardCount = 0;
      if (captured.selection === "environment" && allowed) {
        homeCount = reader.preflight(homeQuery, [everyoneGroup], homeFields, 1, projectionBudget);
        boardCount = reader.preflight(boardQuery, [], boardFields, 4096, projectionBudget);
      }
      const steps = reader.payload(stepQuery, [], stepFields, 1, stepCount);
      if (captured.selection === "environment" && allowed) {
        homes = reader.payload(homeQuery, [everyoneGroup], homeFields, 1, homeCount);
        boards = reader.payload(boardQuery, [], boardFields, 4096, boardCount);
      }
      reader.nativeNow();
      reader.check();
      return { epoch, steps, users, admin, claimValue, allowed, homes, boards, credentialWitness: credential.witness };
    } catch (error) {
      credential.witness.fill(0);
      throw error;
    }
  }

  execute(): void {
    this.reader.initialize();
    const observed = this.observe(true);
    this.credentialWitness = observed.credentialWitness;
    this.epoch = observed.epoch;
    const sourceStep = observed.steps[0];
    let step: string | null = null;
    let previousStep: string | null = null;
    if (sourceStep) {
      step = text(sourceStep.step, 64, 256);
      if (sourceStep.previousStep !== null) previousStep = text(sourceStep.previousStep, 64, 256);
    }
    const current = Object.freeze({ step, previousStep });
    const { configuration } = this.captured;
    let result: OnboardingCoreReadResult;
    if (this.captured.selection === "current-step") {
      result = Object.freeze({ selection: "current-step", current, bounds: this.clock.bounds() });
    } else {
      const availableBoards: { readonly id: string; readonly name: string }[] = [];
      let firstBoard: OnboardingCoreReadBoard | null = null;
      let homeBoard: OnboardingCoreReadBoard | null = null;
      const homeId = observed.homes[0]?.homeBoardId;
      for (const row of observed.boards) {
        this.reader.check();
        const board = Object.freeze({
          id: text(row.id, 255, 1020),
          name: text(row.name, 255, 1020),
          primaryColor: text(row.primaryColor, 7, 28),
          secondaryColor: text(row.secondaryColor, 7, 28),
        });
        firstBoard ??= board;
        if (board.id === homeId) homeBoard = board;
        availableBoards.push(Object.freeze({ id: board.id, name: board.name }));
      }
      let initialBoard = homeBoard;
      if (initialBoard === null && availableBoards.length === 1) initialBoard = firstBoard;
      let workshopApiUrl = "";
      let workshopUrl = "";
      if (observed.allowed) {
        workshopApiUrl = configuration.workshopApiUrl;
        workshopUrl = configuration.workshopUrl;
      }
      const mcpEndpoint = `${configuration.serverOrigin}/api/mcp`;
      const environment: OnboardingCoreReadEnvironment = Object.freeze({
        version: configuration.version,
        currentStep: step,
        databaseDriver: "sqlite",
        externalAuthEnabled:
          configuration.enabledProviders.includes("ldap") || configuration.enabledProviders.includes("oidc"),
        dockerConfigured: observed.allowed && configuration.dockerEnabled,
        kubernetesConfigured: observed.allowed && configuration.kubernetesEnabled,
        workshopApiUrl,
        workshopUrl,
        serverOrigin: configuration.serverOrigin,
        mcpEndpoint,
        canConfigurePrivileged: observed.admin,
        hasUsers: observed.users,
        initialBoard,
        availableBoards: Object.freeze(availableBoards),
      });
      result = Object.freeze({ selection: "environment", current, environment, bounds: this.clock.bounds() });
    }
    this.reader.check();
    const encoded = JSON.stringify(result);
    const bytes = Buffer.byteLength(encoded, "utf8");
    if (bytes > Math.min(8 * 1024 * 1024, configuration.maximumResponseBytes)) return overflow();
    this.witness = this.witnessOf(observed);
    this.result = result;
    this.complete = true;
    this.reader.check();
  }

  private witnessOf(observed: CoreObservation): Buffer {
    const digest = createHash("sha256");
    digest.update(
      JSON.stringify({
        epoch: observed.epoch,
        users: observed.users,
        admin: observed.admin,
        claim: observed.claimValue.raw,
        allowed: observed.allowed,
      }),
    );
    for (const rows of [observed.steps, observed.homes, observed.boards]) {
      const value = fingerprint(rows, this.reader.check);
      try {
        digest.update(value);
      } finally {
        value.fill(0);
      }
    }
    this.reader.check();
    return digest.digest();
  }

  commitCheck(): void {
    this.reader.check();
    if (!this.complete || this.witness === undefined || !this.result) return unavailable();
    const observed = this.observe(false);
    let witness: Buffer | undefined;
    try {
      witness = this.witnessOf(observed);
      if (
        !this.credentialWitness ||
        this.credentialWitness.byteLength !== observed.credentialWitness.byteLength ||
        !timingSafeEqual(this.credentialWitness, observed.credentialWitness) ||
        !timingSafeEqual(this.witness, witness)
      )
        return unavailable();
      this.reader.check();
    } finally {
      witness?.fill(0);
      observed.credentialWitness.fill(0);
    }
  }

  assertSettled(): void {
    const reader = new CoreReader(this.client, this.clock, this.assertCurrent, this.quarantine, false);
    reader.initialize();
    const epoch = assertEpoch(
      single(reader.rows("SELECT epoch FROM main.homarr_runtime_meta WHERE id = 1 LIMIT 2", [], epochFields, 1)).epoch,
    );
    reader.nativeNow();
    if (!this.complete || epoch !== this.epoch) return unavailable();
    reader.check();
  }

  detach(): OnboardingCoreReadResult {
    this.clock.check();
    const result = this.result;
    if (!this.complete || !result) return unavailable();
    return Object.freeze({ ...result, bounds: this.clock.bounds() });
  }

  dispose(): void {
    this.complete = false;
    const errors: unknown[] = [];
    for (const value of [this.witness, this.credentialWitness]) {
      try {
        value?.fill(0);
      } catch (error) {
        errors.push(error);
      }
    }
    this.witness = undefined;
    this.credentialWitness = undefined;
    this.epoch = undefined;
    this.result = undefined;
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, "CORE witness retirement failed", { cause: errors[0] });
  }
}
