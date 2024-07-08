"use server";

import type { WidgetProps } from "../definition";
import { api } from "@homarr/api/server";

export default async function getServerDataAsync({ itemId }: WidgetProps<"rssFeed">) {
  if (!itemId) {
    return {
      initialData: undefined,
      lastUpdatedAt: null
    }
  }
  const data = await api.widget.rssFeed.getFeeds({
    itemId
  });
  return {
    initialData: data?.data,
    lastUpdatedAt: data?.timestamp
  }
}