import type { TracearrStream } from "@homarr/integrations/types";
import { formatBitRate } from "@homarr/common";

export function formatTracearrBitrate(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps <= 0) return "—";
  return formatBitRate(kbps * 1000);
}

export function formatTotalTracearrBitrate(streams: readonly Pick<TracearrStream, "bitrate">[]): string {
  const totalKbps = streams.reduce((sum, { bitrate }) => {
    if (bitrate === null || !Number.isFinite(bitrate) || bitrate <= 0) return sum;
    return sum + bitrate;
  }, 0);
  return formatTracearrBitrate(totalKbps);
}
