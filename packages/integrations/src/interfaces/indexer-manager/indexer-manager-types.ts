export interface Indexer {
  id: number | string;
  name: string;
  url: string;
  /**
   * Enabled: when the user enable / disable the indexer.
   * Status: when there is an error with the indexer site.
   * A null status means the provider does not expose health.
   */
  enabled: boolean;
  status: boolean | null;
}
