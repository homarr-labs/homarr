"use server";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds, itemId }: WidgetProps<"calendar">) {
  if (!itemId) {
    return {
      initialData: [],
    };
  }
  try {
    const data = await api.widget.calendar.findAllEvents({
      integrationIds,
      itemId,
    });

    return {
      initialData: data
        .filter(
          (
            item,
          ): item is Exclude<Exclude<RouterOutputs["widget"]["calendar"]["findAllEvents"][number], null>, undefined> =>
            item !== null,
        )
        .flatMap((item) => item.data),
    };
  } catch (error) {
    return {
      initialData: [],
    };
  }
}
