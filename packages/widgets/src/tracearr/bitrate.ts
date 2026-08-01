import type { TracearrStream } from "@homarr/integrations/types";

export function formatTracearrBitrate(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps <= 0) return "—";
  if (kbps >= 1_000_000) return `${formatScaledBitrate(kbps / 1_000_000)} Gbps`;
  if (kbps >= 1000) return `${formatScaledBitrate(kbps / 1000)} Mbps`;
  return `${kbps} kbps`;
}

export function formatTotalTracearrBitrate(streams: readonly Pick<TracearrStream, "bitrate">[]): string {
  const totalKbps = streams.reduce((sum, { bitrate }) => {
    if (bitrate === null || !Number.isFinite(bitrate) || bitrate <= 0) return sum;
    return sum + bitrate;
  }, 0);
  return formatTracearrBitrate(totalKbps);
}

function formatScaledBitrate(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}
