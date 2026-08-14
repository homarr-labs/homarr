export interface TracearrSource {
  integrationId: string;
  integrationName: string;
}

export type SourcedTracearrItem<T extends { id: string }> = T &
  TracearrSource & {
    key: string;
  };

export const attachTracearrSource = <T extends { id: string }>(
  items: readonly T[],
  source: TracearrSource,
): SourcedTracearrItem<T>[] =>
  items.map((item) => ({
    ...item,
    ...source,
    key: `${source.integrationId}:${item.id}`,
  }));
