"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../../definition";

export default async function getServerDataAsync({
  integrations,
}: WidgetProps<"dnsHoleSummary">) {
  const integrationId = integrations.at(0)?.id;
  if (!integrationId) return { initialData: undefined };

  try {
    const data = await api.widget.dnsHole.summary({
      integrationId,
    });

    return {
      initialData: data,
    };
  } catch (error) {
    return {
      initialData: undefined,
    };
  }
}
