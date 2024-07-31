"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"downloads">) {
  if (integrationIds.length === 0) {
    return {
      initialData: {
        data: [],
      },
    };
  }

  const data = await api.widget.downloads.getData({
    integrationIds,
  });

  return {
    initialData: {
      data,
    },
  };
}
