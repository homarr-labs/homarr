"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ itemId }: WidgetProps<"rssFeed">) {
  if (!itemId) {
    return {
      initialData: undefined,
      lastUpdatedAt: null,
    };
  }
  const data = await api.widget.rssFeed.getFeeds({
    itemId,
  });
  return {
    initialData: data?.data,
    lastUpdatedAt: data?.timestamp,
  };
}
