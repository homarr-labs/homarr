"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Input, ScrollArea, SimpleGrid, Stack } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export const selectGridCols = { base: 1, xs: 2, sm: 3, md: 4, lg: 5 };
export const selectGridCardHeight = 140;
export const selectGridScrollMaxHeight = "70vh";

interface SelectGridLayoutProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  disableScroll?: boolean;
  disableAutoFocus?: boolean;
  children: ReactNode;
}

export const SelectGridLayout = ({
  search,
  onSearchChange,
  placeholder,
  ariaLabel,
  onSearchKeyDown,
  disableScroll = false,
  disableAutoFocus = false,
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
        aria-label={ariaLabel}
        data-autofocus={disableAutoFocus ? undefined : true}
        onKeyDown={onSearchKeyDown}
      />

      {disableScroll ? grid : <ScrollArea.Autosize mah={selectGridScrollMaxHeight}>{grid}</ScrollArea.Autosize>}
    </Stack>
  );
};
