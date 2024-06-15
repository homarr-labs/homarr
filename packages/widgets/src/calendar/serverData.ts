"use server";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"calendar">) {
  try {
    const data = await api.widget.calendar.findAllEvents({
      integrationIds,
    });

    return {
      initialData: data
        .filter(
          (item): item is Exclude<RouterOutputs["widget"]["calendar"]["findAllEvents"][number], null> => item !== null,
        )
        .flatMap((item) => item.data),
    };
  } catch (error) {
    return {
      initialData: [],
    };
  }
}
