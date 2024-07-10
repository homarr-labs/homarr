"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"mediaServer">) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  const currentStreams = await api.widget.mediaServer.getCurrentStreams({
    integrationIds,
  });

  return {
    initialData: currentStreams,
  };
}
