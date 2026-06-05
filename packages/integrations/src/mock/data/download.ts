import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { IDownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";

const mockItems: Omit<DownloadClientItem, "id" | "index">[] = [
  {
    name: "Big.Buck.Bunny.2008.1080p.BluRay.x264",
    type: "torrent",
    size: 4_700_000_000,
    progress: 0.47,
    state: "leeching",
    downSpeed: 12_400_000,
    upSpeed: 890_000,
    sent: 420_000_000,
    received: 2_209_000_000,
    time: 201_000,
    category: "movies",
  },
  {
    name: "Ubuntu.24.04.1.LTS.Desktop.amd64.iso",
    type: "torrent",
    size: 5_800_000_000,
    progress: 0.82,
    state: "leeching",
    downSpeed: 34_500_000,
    upSpeed: 2_100_000,
    sent: 1_200_000_000,
    received: 4_756_000_000,
    time: 30_000,
    category: "iso",
  },
  {
    name: "Sintel.2010.4K.DTS-HD.MA.5.1.mkv",
    type: "torrent",
    size: 18_200_000_000,
    progress: 0.03,
    state: "leeching",
    downSpeed: 1_200_000,
    upSpeed: 50_000,
    sent: 30_000_000,
    received: 546_000_000,
    time: 14_880_000,
    category: "movies",
  },
  {
    name: "Arch.Linux.2024.12.01.x86_64.iso",
    type: "torrent",
    size: 1_100_000_000,
    progress: 1,
    state: "seeding",
    downSpeed: 0,
    upSpeed: 4_500_000,
    sent: 3_300_000_000,
    received: 1_100_000_000,
    time: -7_200_000,
    category: "iso",
  },
  {
    name: "Tears.of.Steel.2012.1080p.DTS.mkv",
    type: "torrent",
    size: 7_340_000_000,
    progress: 0,
    state: "paused",
    downSpeed: 0,
    upSpeed: 0,
    time: 0,
    category: "movies",
  },
  {
    name: "Cosmos.Laundromat.First.Cycle.2015.4K.mkv",
    type: "torrent",
    size: 12_000_000_000,
    progress: 0.65,
    state: "stalled",
    downSpeed: 0,
    upSpeed: 0,
    sent: 200_000_000,
    received: 7_800_000_000,
    time: 0,
    category: "movies",
  },
  {
    name: "Spring.2019.4K.HDR.mkv",
    type: "usenet",
    size: 3_200_000_000,
    progress: 0.91,
    state: "downloading",
    downSpeed: 45_000_000,
    time: 6_500,
    category: "movies",
  },
  {
    name: "Agent.327.Operation.Barbershop.2017.1080p.mkv",
    type: "usenet",
    size: 1_800_000_000,
    progress: 1,
    state: "completed",
    time: -3_600_000,
    category: "movies",
  },
  {
    name: "Caminandes.3.Llamigos.2016.1080p.mkv",
    type: "torrent",
    size: 890_000_000,
    progress: 1,
    state: "seeding",
    downSpeed: 0,
    upSpeed: 1_800_000,
    sent: 2_670_000_000,
    received: 890_000_000,
    time: -86_400_000,
    category: "movies",
  },
  {
    name: "Hero.2024.S01.1080p.WEB-DL.DDP5.1",
    type: "usenet",
    size: 9_400_000_000,
    progress: 0.22,
    state: "downloading",
    downSpeed: 28_000_000,
    time: 244_000,
    category: "tv",
  },
];

export class DownloadClientMockService implements IDownloadClientIntegration {
  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await Promise.resolve({
      status: {
        paused: false,
        rates: {
          down: 121_100_000,
          up: 9_340_000,
        },
        types: ["torrent", "usenet"] as const,
      },
      items: mockItems.slice(0, input.limit).map((item, index) => ({
        ...item,
        id: `mock-${index}`,
        index,
      })),
    });
  }

  public async pauseQueueAsync(): Promise<void> {
    await Promise.resolve();
  }

  public async pauseItemAsync(_item: DownloadClientItem): Promise<void> {
    await Promise.resolve();
  }

  public async resumeQueueAsync(): Promise<void> {
    await Promise.resolve();
  }

  public async resumeItemAsync(_item: DownloadClientItem): Promise<void> {
    await Promise.resolve();
  }

  public async deleteItemAsync(_item: DownloadClientItem, _fromDisk: boolean): Promise<void> {
    await Promise.resolve();
  }
}
