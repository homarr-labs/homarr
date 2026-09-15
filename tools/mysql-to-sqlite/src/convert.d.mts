import type { ConnectionOptions } from "mysql2/promise";

export function convert(options: {
  connectionOptions: ConnectionOptions;
  output: string;
  homarrStopped: boolean;
  signal?: AbortSignal;
}): Promise<{ release: string; output: string; counts: Record<string, number> }>;
