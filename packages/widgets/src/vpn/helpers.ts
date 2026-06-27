import type { RouterOutputs } from "@homarr/api";

export const RUNNING_STATUS = "running";

type VpnInfoItem = RouterOutputs["widget"]["vpn"]["getSummaries"][number];

export function getStatusColor(status: string) {
  return status === RUNNING_STATUS ? "green" : "red";
}

export function updateVpnInfoFromSubscription(
  prevData: VpnInfoItem[] | undefined,
  data: { integration: { id: string }; summary: VpnInfoItem["summary"] },
): VpnInfoItem[] | undefined {
  if (!prevData) {
    return undefined;
  }

  return prevData.map((item) =>
    item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
  );
}
