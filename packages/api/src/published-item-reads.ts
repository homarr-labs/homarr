/** Persisted selections shared by native publication checks and remote display reads.
 * Execution, grant freshness and signed media remain the responsibility of their adapters.
 */
interface PublishedItemSelection {
  options: Readonly<Record<string, unknown>>;
  integrationIds: readonly string[];
}
export interface PublishedSystemSelection {
  integrationId: string;
  systemId: string;
}

function sameSystem(left: PublishedSystemSelection, right: PublishedSystemSelection) {
  return left.integrationId === right.integrationId && left.systemId === right.systemId;
}

export function createPublishedBeszelRead(item: PublishedItemSelection) {
  const stored = item.options.systemId;
  const includeDocker = ["showDockerCpu", "showDockerMemory", "showDockerNetwork"].some(
    (key) => item.options[key] === true,
  );
  const inScope = (system: PublishedSystemSelection) => item.integrationIds.includes(system.integrationId);
  return {
    includeDocker,
    timePeriod: item.options.timePeriod ?? "1h",
    selectSystem(available: readonly PublishedSystemSelection[]): PublishedSystemSelection | undefined {
      const scoped = available.filter(inScope);
      const qualified = scoped.find((system) => `${system.integrationId}:${system.systemId}` === stored);
      if (qualified) return qualified;
      if (!stored) return scoped[0];
      const legacy = scoped.filter((system) => system.systemId === stored);
      if (legacy.length === 1) return legacy[0];
      return undefined;
    },
    allowsSystem(requested: PublishedSystemSelection, disclosedDefault?: PublishedSystemSelection): boolean {
      if (!inScope(requested)) return false;
      if (stored === `${requested.integrationId}:${requested.systemId}`) return true;
      // Native unqualified reads are safe without discovery only for a single saved integration.
      if (item.integrationIds.length === 1 && stored === requested.systemId) return true;
      return !stored && disclosedDefault !== undefined && sameSystem(requested, disclosedDefault);
    },
  };
}

export function publishedAlbumSelection(options: Readonly<Record<string, unknown>>): unknown {
  const stored = options.albumId;
  if (stored === "all" || stored === "") return undefined;
  return stored;
}

/** Native viewers and the remote DTO intentionally retain different transcoding limits. */
export function publishedMediaPage(
  kind: "mediaMissing" | "mediaTranscoding",
  options: Readonly<Record<string, unknown>>,
) {
  let value = options.pageSize;
  let displayMaximum = 50;
  let viewerMaximum = 50;
  if (kind === "mediaTranscoding") {
    value = options.queuePageSize;
    displayMaximum = 30;
    viewerMaximum = 25;
  }
  let displaySize = Number(value);
  if (!Number.isFinite(displaySize)) displaySize = 10;
  displaySize = Math.max(1, Math.min(displayMaximum, Math.floor(displaySize)));
  return {
    displaySize,
    allowsViewerSize(size: unknown): boolean {
      return typeof size === "number" && size >= 1 && size <= viewerMaximum;
    },
  };
}
