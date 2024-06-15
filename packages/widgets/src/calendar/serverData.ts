"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"calendar">) {
  try {
    const data = await api.widget.calendar.findAllEvents({
      integrationIds,
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
