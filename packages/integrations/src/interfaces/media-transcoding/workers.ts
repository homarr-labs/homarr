export interface TdarrWorker {
  id: string;
  filePath: string;
  fps: number;
  percentage: number;
  ETA: string;
  jobType: "transcode" | "health-check";
  status: string;
  step: string;
  originalSize: number;
  estimatedSize: number | null;
  outputSize: number | null;
}
