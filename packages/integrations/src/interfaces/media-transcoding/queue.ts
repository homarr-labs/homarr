export interface TdarrQueue {
  array: {
    id: string;
    healthCheck: string;
    transcode: string;
    filePath: string;
    fileSize: number;
    container: string;
    codec: string;
    resolution: string;
    type: "transcode" | "health-check";
  }[];
  totalCount: number;
  startIndex: number;
  endIndex: number;
}
