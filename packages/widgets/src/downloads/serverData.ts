"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"downloads">) {
  if (integrationIds.length === 0) {
    return {
      initialData: undefined,
    };
  }

  const jobsAndStatuses = await api.widget.downloads.getJobsAndStatuses({
    integrationIds,
  });

  return {
    initialData: jobsAndStatuses,
  };
}
