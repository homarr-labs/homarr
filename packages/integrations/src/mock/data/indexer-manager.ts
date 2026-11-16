import type { IIndexerManagerIntegration } from "../../interfaces/indexer-manager/indexer-manager-integration";
import type { Indexer } from "../../types";

const indexers: Indexer[] = [
  { id: 1, name: "LinuxTracker", url: "https://linuxtracker.org", enabled: true, status: true },
  { id: 2, name: "Internet Archive", url: "https://archive.org", enabled: true, status: true },
  { id: 3, name: "Academic Torrents", url: "https://academictorrents.com", enabled: true, status: true },
  { id: 4, name: "Private tracker", url: "https://example.com", enabled: false, status: false },
];

export class IndexerManagerMockService implements IIndexerManagerIntegration {
  public async getIndexersAsync(): Promise<Indexer[]> {
    return indexers.map((indexer) => ({ ...indexer }));
  }

  public async testAllAsync(): Promise<void> {
    await Promise.resolve();
  }
}
