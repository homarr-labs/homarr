import type { MRT_RowData, MRT_TableOptions } from "mantine-react-table";
import { useMantineReactTable } from "mantine-react-table";
import { MRT_Localization_EN } from "mantine-react-table/locales/en/index.cjs";

import { objectKeys } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

export const useTranslatedMantineReactTable = <TData extends MRT_RowData>(
  tableOptions: Omit<MRT_TableOptions<TData>, "localization">,
) => {
  const t = useScopedI18n("common.mantineReactTable");
  return useMantineReactTable<TData>({
    ...tableOptions,
    localization: objectKeys(MRT_Localization_EN).reduce(
      (acc, key) => {
        acc[key] = t(key);
        return acc;
      },
      {} as typeof MRT_Localization_EN,
    ),
  });
};
