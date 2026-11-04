import type { ReactNode } from "react";
import { Center, rem, ScrollArea, Table, TableTbody, TableThead, TableTr, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface TranscodingPanelTableProps {
  empty: boolean;
  head: ReactNode;
  children: ReactNode;
}

export function TranscodingPanelTable({ empty, head, children }: TranscodingPanelTableProps) {
  const t = useI18n("widget.mediaTranscoding.panel.common");

  if (empty) {
    return (
      <Center style={{ flex: "1" }}>
        <Title order={6}>{t("empty")}</Title>
      </Center>
    );
  }

  return (
    <ScrollArea style={{ flex: "1" }}>
      <Table
        style={{ tableLayout: "fixed" }}
        styles={{
          th: {
            textAlign: "start",
            paddingBlock: rem(4),
            fontSize: "var(--mantine-font-size-xs)",
            lineHeight: "var(--mantine-line-height-xs)",
            fontWeight: "bold",
          },
          td: { paddingBlock: rem(2) },
        }}
      >
        <TableThead>
          <TableTr>{head}</TableTr>
        </TableThead>
        <TableTbody>{children}</TableTbody>
      </Table>
    </ScrollArea>
  );
}
