"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Input, ScrollArea, SimpleGrid, Stack } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export const selectGridCols = { base: 2, xs: 3, sm: 4, md: 5 };
export const selectGridCardHeight = 180;
export const selectGridScrollMaxHeight = "70vh";

interface SelectGridLayoutProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  disableScroll?: boolean;
  children: ReactNode;
}

export const SelectGridLayout = ({
  search,
  onSearchChange,
  placeholder,
  onSearchKeyDown,
  disableScroll = false,
  children,
}: SelectGridLayoutProps) => {
  const grid = (
    <SimpleGrid cols={selectGridCols} spacing="sm">
      {children}
    </SimpleGrid>
  );

  return (
    <Stack>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={<IconSearch />}
        placeholder={placeholder}
        data-autofocus
        onKeyDown={onSearchKeyDown}
      />

      {disableScroll ? grid : <ScrollArea.Autosize mah={selectGridScrollMaxHeight}>{grid}</ScrollArea.Autosize>}
    </Stack>
  );
};
