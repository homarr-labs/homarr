import type { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import type { StateChannels } from "@homarr/redis/state";
import type { UpdateStateResources } from "@homarr/request-handler/update-checker-state";

export interface Update {
  name: string | null;
  contentHtml?: string;
  url: string;
  tagName: string;
  isPrerelease: boolean;
}

export interface UpdateCheckCacheEntry {
  availableUpdates: Update[];
  attemptedAt: number;
  checkedAt: number | null;
}

export interface UpdateCheckerRelease {
  name: string | null;
  body_html?: string;
  html_url: string;
  tag_name: string;
  prerelease: boolean;
}

export interface UpdateCheckerOctokitConstructor {
  new (options: { request: { fetch: typeof fetchWithTrustedCertificatesAsync }; throttle: { enabled: false } }): {
    rest: {
      repos: {
        listReleases(input: {
          owner: "homarr-labs";
          repo: "homarr";
          request: { signal: AbortSignal };
        }): Promise<{ data: UpdateCheckerRelease[] }>;
      };
    };
  };
}

export interface UpdateCheckerProcedureResources extends Pick<
  UpdateStateResources<Update>,
  "diagnostics" | "currentVersion" | "isExternalConnectionAllowed"
> {
  readonly state: {
    createChannels(signal?: AbortSignal): StateChannels;
  };
  readonly clock: {
    now(): number;
    waitAsync(durationMs: number, signal: AbortSignal): Promise<void>;
  };
  readonly semver: {
    isValidSemVer(version: string): boolean;
    parseSemVer(version: string): { pre: (string | number)[] | undefined };
    compareSemVer(version: string, base: string): number;
  };
  readonly Octokit: UpdateCheckerOctokitConstructor;
  readonly fetchWithTrustedCertificatesAsync: typeof fetchWithTrustedCertificatesAsync;
  readonly logger: {
    debug(message: string, metadata: Record<string, unknown>): void;
    info(message: string, metadata: Record<string, unknown>): void;
    warn(message: string, metadata: Record<string, unknown>): void;
  };
  readonly routerLogger: {
    error(error: Error): void;
  };
}
