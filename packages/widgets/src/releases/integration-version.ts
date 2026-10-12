import { isTrpcForbiddenError } from "@homarr/api/query-cache";
import type { IntegrationKind } from "@homarr/definitions";

import type { ReleasesRepositoryIntegration } from "./releases-repository";

interface ServiceVersionResult {
  integrationId: string;
  integrationName: string;
  integrationKind: IntegrationKind;
  version: string | null;
  error?: string;
}

// An optional "v", dot-separated numbers and an optional LinuxServer.io build suffix ("-ls325"). Anything else, such
// as architecture prefixes, digests, pre-release suffixes or malformed values, can't be compared.
const supportedVersionPattern = /^v?(\d+(?:\.\d+)*)(?:-ls\d+)?$/i;

const parseVersion = (value: string | undefined) => {
  const numeric = supportedVersionPattern.exec((value ?? "").trim())?.[1];
  if (!numeric) return null;
  return numeric.split(".").map((part) => Number.parseInt(part, 10));
};

// Calendar versions ("2026.10.11", "20261011") only compare with other calendar versions in the same format: an
// undotted date is a single part, so comparing it part by part with a dotted one is meaningless.
const isCalendarVersion = (parts: number[]) => (parts[0] ?? 0) >= 1900;
const isUndottedVersion = (parts: number[]) => parts.length === 1;

/**
 * Compares every version part, padding the shorter one with zeros. A running version newer than the latest
 * release counts as up to date. Undefined when either version has an unsupported format, when only one of them
 * is a calendar version, or when calendar versions mix dotted and undotted formats.
 */
export const isVersionUpToDate = (running: string | undefined, latest: string | undefined) => {
  const [runningParts, latestParts] = [parseVersion(running), parseVersion(latest)];
  if (!runningParts || !latestParts) return undefined;
  if (isCalendarVersion(runningParts) !== isCalendarVersion(latestParts)) return undefined;
  if (isCalendarVersion(runningParts) && isUndottedVersion(runningParts) !== isUndottedVersion(latestParts)) {
    return undefined;
  }

  for (let index = 0; index < Math.max(runningParts.length, latestParts.length); index++) {
    const difference = (runningParts[index] ?? 0) - (latestParts[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
};

const VERSION_MAX_LENGTH = 20;
const VERSION_DISPLAY_LENGTH = 17;

/** Shortens long versions the same way as What's Up Docker. The full value is shown in a tooltip. */
export const truncateVersion = (value: string) =>
  value.length > VERSION_MAX_LENGTH ? `${value.slice(0, VERSION_DISPLAY_LENGTH)}…` : value;

/**
 * Integrations for the error indicator. The query rejects when every integration fails, which leaves no names to
 * list; that is reported even when an earlier fetch left cached versions on screen. Permission errors are not.
 */
export const getFailedServiceVersionIntegrations = (
  query: { data: readonly ServiceVersionResult[] | undefined; error: unknown },
  totalFailureName: string,
) => {
  if (query.error && !isTrpcForbiddenError(query.error)) {
    return [{ integrationId: "service-versions", integrationName: totalFailureName, error: "failed" }];
  }

  return (query.data ?? []).flatMap(({ integrationId, integrationName, error }) =>
    error ? [{ integrationId, integrationName, error }] : [],
  );
};

/** Running versions for a row's links, keeping only integrations still attached to the widget. */
export const getRowIntegrationVersions = (
  rowIntegrationIds: readonly string[],
  attachedIntegrationIds: readonly string[],
  results: readonly ServiceVersionResult[],
  latestRelease: string | undefined,
): ReleasesRepositoryIntegration[] =>
  rowIntegrationIds.flatMap((integrationId) => {
    if (!attachedIntegrationIds.includes(integrationId)) return [];
    const result = results.find((candidate) => candidate.integrationId === integrationId);
    if (!result?.version) return [];

    return [
      {
        id: integrationId,
        kind: result.integrationKind,
        name: result.integrationName,
        version: result.version,
        isUpToDate: isVersionUpToDate(result.version, latestRelease),
      },
    ];
  });
