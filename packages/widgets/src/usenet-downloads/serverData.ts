"use server";
import type {WidgetProps} from "../definition";
import {api} from "@homarr/api/server";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"usenet-downloads">) {
  if (integrationIds.length === 0) {
    return {
      initialData: {
        queue: []
      },
    };
  }

  const queue = await api.widget.usenetDownloads.getQueue({
    integrationIds
  });

  return {
    initialData: {
      queue,
    }
  }
}