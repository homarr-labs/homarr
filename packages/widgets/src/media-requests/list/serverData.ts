"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../../definition";

export default async function getServerDataAsync({ integrationIds, itemId }: WidgetProps<"mediaRequests-requestList">) {
  if (integrationIds.length === 0 || !itemId) {
    return {
      initialData: [],
    };
  }

  const requests = await api.widget.mediaRequests.getLatestRequests({
    integrationIds,
    itemId,
  });

  return {
    initialData: requests.filter((group) => group != null),
  };
}
