"use server";

import { api } from "@homarr/api/server";

import { widgetKind } from ".";
import type { WidgetProps } from "../../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<typeof widgetKind>) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  try {
    const currentDns = await api.widget.dnsHole.summary({
      widgetKind,
      integrationIds,
    });

    return {
      initialData: currentDns,
    };
  } catch {
    return {
      initialData: [],
    };
  }
}
