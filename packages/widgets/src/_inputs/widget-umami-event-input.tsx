"use client";

import { Select, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetUmamiEventInput = ({ property, kind }: CommonWidgetInputProps<"umamiEventName">) => {
  const t = useScopedI18n("widget.umami.option.eventName");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds;
  const websiteId = form.values.options.websiteId as string | undefined;

  const { data: eventNames, isPending } = clientApi.widget.umami.getEventNames.useQuery(
    { integrationId: integrationIds[0] ?? "", websiteId: websiteId ?? "" },
    { enabled: Boolean(integrationIds[0]) && Boolean(websiteId) },
  );

  if (!websiteId || integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureWebsiteFirst")}
      </Text>
    );
  }

  const data = [{ value: "", label: t("none") }, ...(eventNames ?? [])];

  return (
    <Select
      label={tInput("label")}
      description={tInput("description")}
      placeholder={isPending ? t("loading") : undefined}
      searchable
      nothingFoundMessage={t("noEvents")}
      data={data}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
