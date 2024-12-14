export interface TdarrPieSegment {
  name: string;
  value: number;
}

export interface TdarrStatistics {
  totalFileCount: number;
  totalTranscodeCount: number;
  totalHealthCheckCount: number;
  failedTranscodeCount: number;
  failedHealthCheckCount: number;
  stagedTranscodeCount: number;
  stagedHealthCheckCount: number;
  pies: {
    libraryName: string;
    libraryId: string;
    totalFiles: number;
    totalTranscodes: number;
    savedSpace: number;
    totalHealthChecks: number;
    transcodeStatus: TdarrPieSegment[];
    healthCheckStatus: TdarrPieSegment[];
    videoCodecs: TdarrPieSegment[];
    videoContainers: TdarrPieSegment[];
    videoResolutions: TdarrPieSegment[];
    audioCodecs: TdarrPieSegment[];
    audioContainers: TdarrPieSegment[];
  }[];
}
