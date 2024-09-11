export interface NzbGetStatus {
  DownloadPaused: boolean;
  DownloadRate: number;
}

export interface NzbGetGroup {
  Status: string;
  NZBID: number;
  MaxPriority: number;
  NZBName: string;
  FileSizeLo: number;
  FileSizeHi: number;
  ActiveDownloads: number;
  RemainingSizeLo: number;
  RemainingSizeHi: number;
  DownloadTimeSec: number;
  Category: string;
  DownloadedSizeMB: number;
  FileSizeMB: number;
}

export interface NzbGetHistory {
  ScriptStatus: string;
  NZBID: number;
  Name: string;
  FileSizeLo: number;
  FileSizeHi: number;
  HistoryTime: number;
  DownloadTimeSec: number;
  Category: string;
}
