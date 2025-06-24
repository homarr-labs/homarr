import type { FirewallInterface, FirewallInterfacesSummary } from "@homarr/integrations";

export function formatBitsPerSec(bytes: number, decimals: number): string {
  if (bytes === 0) return "0 Bytes";

  const kilobyte = 1024;
  const sizes = ["b/s", "kb/s", "Mb/s", "Gb/s", "Tb/s", "Pb/s", "Eb/s", "Zb/s", "Yb/" + "s"];

  const i = Math.floor(Math.log(bytes) / Math.log(kilobyte));

  return parseFloat((bytes / Math.pow(kilobyte, i)).toFixed(decimals)) + " " + sizes[i];
}

export function calculateBandwidth(data: FirewallInterfacesSummary[]): { data: FirewallInterface[] } {
  const result = {
    data: [] as FirewallInterface[],
    timestamp: new Date().toISOString(),
  };

  if (data.length > 1) {
    const firstData = data[0];
    const secondData = data[1];

    if (firstData && secondData) {
      const time1 = new Date(firstData.timestamp);
      const time2 = new Date(secondData.timestamp);
      const timeDiffInSeconds = (time1.getTime() - time2.getTime()) / 1000;

      firstData.data.forEach((iface) => {
        const ifaceName = iface.name;
        const recv1 = iface.receive;
        const trans1 = iface.transmit;

        const iface2 = secondData.data.find((i) => i.name === ifaceName);

        if (iface2) {
          const recv2 = iface2.receive;
          const trans2 = iface2.transmit;
          const recvDiff = recv1 - recv2;
          const transDiff = trans1 - trans2;

          result.data.push({
            name: ifaceName,
            receive: (8 * recvDiff) / timeDiffInSeconds,
            transmit: (8 * transDiff) / timeDiffInSeconds,
          });
        }
      });
    }
  }

  return result;
}
