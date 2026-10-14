import { useSuspenseQuery } from "@tanstack/react-query";
import type { MRT_RowData, MRT_TableOptions } from "mantine-react-table";
import { useMantineReactTable } from "mantine-react-table";

import { localeConfigurations } from "@homarr/translation";
import { useCurrentLocale, useFormatter, useNow } from "@homarr/translation/client";

export function useTranslatedMantineReactTable<TData extends MRT_RowData>(
  tableOptions: Omit<MRT_TableOptions<TData>, "localization">,
) {
  const locale = useCurrentLocale();
  const configuration = Object.entries(localeConfigurations).find(([key]) => key === locale)?.[1];
  const { data: localization } = useSuspenseQuery({
    queryKey: ["mantine-react-table-locale", locale],
    queryFn: () => (configuration ?? localeConfigurations.en).importMrtLocalization(),
  });
  return useMantineReactTable<TData>({ ...tableOptions, localization });
}

export function useRelativeCreationTime() {
  const formatter = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  return (date: Date | undefined) => {
    if (!date || !Number.isFinite(date.getTime())) return "Not reported";
    return formatter.relativeTime(date, now);
  };
}
