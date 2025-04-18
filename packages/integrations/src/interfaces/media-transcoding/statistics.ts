export interface TdarrPieSegment {
  name: string;
  value: number;
}

export interface TdarrStatistics {
  libraryName: string;
  totalFileCount: number;
  totalTranscodeCount: number;
  totalHealthCheckCount: number;
  failedTranscodeCount: number;
  failedHealthCheckCount: number;
  stagedTranscodeCount: number;
  stagedHealthCheckCount: number;
  totalSavedSpace: number;
  transcodeStatus: TdarrPieSegment[];
  healthCheckStatus: TdarrPieSegment[];
  videoCodecs: TdarrPieSegment[];
  videoContainers: TdarrPieSegment[];
  videoResolutions: TdarrPieSegment[];
  audioCodecs: TdarrPieSegment[];
  audioContainers: TdarrPieSegment[];
}
