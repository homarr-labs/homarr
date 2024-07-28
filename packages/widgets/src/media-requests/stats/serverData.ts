"use server";

import {api} from "@homarr/api/server";

import type {WidgetProps} from "../../definition";

export default async function getServerDataAsync({integrationIds, itemId}: WidgetProps<"mediaRequests-requestStats">) {
  if (integrationIds.length === 0 || !itemId) {
    return {
      initialData: [],
    };
  }

  const stats = await api.widget.mediaRequests.getStats({
    integrationIds,
    itemId
  });

  return {
    initialData: stats
      .filter(group => group != null)
      .flatMap(group => group.data),
  };
}
