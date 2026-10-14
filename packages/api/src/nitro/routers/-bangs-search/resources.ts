import type { ResponseError } from "@homarr/common/server";
import type { DuckDuckGoBang } from "@homarr/request-handler/duckduckgo-bangs";
import type { CacheEntry } from "@homarr/request-handler/lib/request-handler";
import type { Response } from "undici";

export type BangsDatasetEntry = CacheEntry<DuckDuckGoBang[]>;

export interface BangsDatasetTimer {
  cancel(): void;
  unref(): void;
}

export interface BangsDatasetCache {
  readonly entries: Map<string, BangsDatasetEntry>;
  readonly inflight: Map<string, Promise<BangsDatasetEntry>>;
  readonly upstreamSettlements: Map<string, Promise<void>>;
}

export interface BangsTrustedFetchOperation {
  readonly responseAsync: Promise<Response>;
  readonly settledAsync: Promise<void>;
}

export interface BangsSearchProcedureResources {
  readonly policy: { readonly noExternalConnection: boolean };
  readonly cache: BangsDatasetCache;
  readonly clock: {
    now(): number;
    setTimeout(callback: () => void, durationMs: number): BangsDatasetTimer;
  };
  readonly lifetime: {
    readonly signal: AbortSignal;
    onDispose(dispose: () => Promise<void>): void;
    trackTransportSettlement(settledAsync: Promise<void>): void;
  };
  readonly trustedFetch: {
    startFetchWithTrustedCertificates(
      url: "https://duckduckgo.com/bang.js",
      options: {
        readonly signal: AbortSignal;
        readonly headers: { readonly accept: "application/json,text/plain,*/*" };
      },
    ): BangsTrustedFetchOperation;
  };
  readonly ResponseError: typeof ResponseError;
}
