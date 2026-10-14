export interface IconSourceClock {
  monotonicMilliseconds(): number;
  createDeadline(milliseconds: number, signal?: AbortSignal): { signal: AbortSignal; dispose(): void };
}

export interface IconFetchResources {
  noExternalConnection(): boolean;
  assertCurrentAuthorityAsync(signal?: AbortSignal): Promise<void>;
  fetchWithTrustedCertificatesAsync(url: URL, options: { signal: AbortSignal }): Promise<Response>;
  clock: IconSourceClock;
  limits: { maximumIndexBytes: number; maximumFiles: number; maximumPathLength: number };
  reportSourceError(error: unknown, source: { slug: string; kind: "http" | "unavailable" }): void;
}

export interface LocalIconMedia {
  id: string;
  name: string;
  content: Uint8Array;
  size: number;
}

export interface LocalIconResources {
  readMediasAsync(signal?: AbortSignal): Promise<readonly LocalIconMedia[]>;
  assertCurrentAuthorityAsync(signal?: AbortSignal): Promise<void>;
  reportSourceError(error: unknown, source: { slug: string; kind: "http" | "unavailable" }): void;
}

export interface IconSqlStatement {
  sql: string;
  parameters: readonly (string | number | boolean | null)[];
}

export interface IconReadScope {
  dialect: "sqlite" | "postgresql";
  queryAsync(statement: IconSqlStatement): Promise<readonly Record<string, unknown>[]>;
}
