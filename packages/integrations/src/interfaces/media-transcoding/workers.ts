export interface TdarrWorker {
  id: string;
  filePath: string;
  fps: number;
  percentage: number;
  ETA: string;
  jobType: string;
  status: string;
  step: string;
  originalSize: number;
  estimatedSize: number | null;
  outputSize: number | null;
}
