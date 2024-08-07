"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"dnsHoleControls">) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  try {
    const currentDns = await api.widget.dnsHole.summary({
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
