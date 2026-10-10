import { useSuspenseQuery } from "@tanstack/react-query";
import type { MRT_RowData, MRT_TableOptions } from "mantine-react-table";
import { useMantineReactTable } from "mantine-react-table";

import { localeConfigurations } from "@homarr/translation";
import { useCurrentLocale } from "@homarr/translation/client";

export const useTranslatedMantineReactTable = <TData extends MRT_RowData>(
  tableOptions: Omit<MRT_TableOptions<TData>, "localization">,
) => {
  const locale = useCurrentLocale();
  const { data: mantineReactTable } = useSuspenseQuery({
    queryKey: ["mantine-react-table-locale", locale],
    // eslint-disable-next-line no-restricted-syntax
    queryFn: async () => {
      return await localeConfigurations[locale].importMrtLocalization();
    },
  });

  return useMantineReactTable<TData>({
    ...tableOptions,
    localization: mantineReactTable,
  });
};
