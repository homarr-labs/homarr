import type { FirewallInterface, FirewallInterfacesSummary } from "@homarr/integrations";

export function formatBitsPerSec(bitsPerSecond: number, decimals: number): string {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return "0 b/s";

  const unitSize = 1024;
  const sizes = ["b/s", "kb/s", "Mb/s", "Gb/s", "Tb/s", "Pb/s", "Eb/s", "Zb/s", "Yb/s"];
  const unitIndex = Math.min(Math.floor(Math.log(bitsPerSecond) / Math.log(unitSize)), sizes.length - 1);

  return `${parseFloat((bitsPerSecond / Math.pow(unitSize, unitIndex)).toFixed(decimals))} ${sizes[unitIndex]}`;
}

export function calculateBandwidth(data: FirewallInterfacesSummary[]): { data: FirewallInterface[] } {
  const samples = data
    .filter((sample) => Number.isFinite(new Date(sample.timestamp).getTime()))
    .toSorted((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const latest = samples[0];
  const previous = samples[1];

  if (!latest || !previous) return { data: [] };

  const timeDiffInSeconds = (new Date(latest.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000;
  if (timeDiffInSeconds <= 0) return { data: [] };

  return {
    data: latest.data.flatMap((latestInterface) => {
      const previousInterface = previous.data.find((item) => item.name === latestInterface.name);
      if (!previousInterface) return [];

      return [
        {
          name: latestInterface.name,
          receive: Math.max(0, (8 * (latestInterface.receive - previousInterface.receive)) / timeDiffInSeconds),
          transmit: Math.max(0, (8 * (latestInterface.transmit - previousInterface.transmit)) / timeDiffInSeconds),
        },
      ];
    }),
  };
}
