import type { MRT_RowData, MRT_TableOptions } from "mantine-react-table";
import { useMantineReactTable } from "mantine-react-table";

import { useI18nMessages } from "@homarr/translation/client";

export const useTranslatedMantineReactTable = <TData extends MRT_RowData>(
  tableOptions: Omit<MRT_TableOptions<TData>, "localization">,
) => {
  const messages = useI18nMessages();
  return useMantineReactTable<TData>({
    ...tableOptions,
    localization: messages.common.mantineReactTable,
  });
};
