"use server";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"calendar">) {
  try {
    const data = await api.widget.calendar.findAllEvents({
      integrationIds,
      itemId: "" // TODO: Get actual item ID here
    });

    return {
      initialData: data
        .filter(
          (
            item,
          ): item is Exclude<Exclude<RouterOutputs["widget"]["calendar"]["findAllEvents"][number], null>, undefined> =>
            item !== null && item !== undefined,
        )
        .flatMap((item) => item.data),
    };
  } catch (error) {
    return {
      initialData: [],
    };
  }
}
