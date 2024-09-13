"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"indexerManager">) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  try {
    const currentIndexers = await api.widget.indexerManager.getIndexersStatus({
      integrationIds,
    });

    return {
      initialData: currentIndexers,
    };
  } catch {
    return {
      initialData: [],
    };
  }
}
