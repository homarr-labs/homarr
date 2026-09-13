"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { Alert, Center, Loader, Stack, Text } from "@mantine/core";

export { ActionIcon, Badge, Box, Button, Card, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";

export function WidgetEmptyState({ children }: PropsWithChildren) {
  return (
    <Center h="100%">
      <Text c="dimmed" size="sm" ta="center">
        {children}
      </Text>
    </Center>
  );
}

export function WidgetLoading({ label }: { label?: string }) {
  return (
    <Center h="100%">
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        {label && <Text size="sm">{label}</Text>}
      </Stack>
    </Center>
  );
}

export function WidgetError({ children, title, action }: PropsWithChildren<{ title?: string; action?: ReactNode }>) {
  return (
    <Alert color="red" title={title}>
      {children}
      {action}
    </Alert>
  );
}

export { HomarrDataTable, usePersistedTableLayout, useTableLayoutPersistence } from "./table";
export type { DataTableColumn, DataTableProps, DataTableSortStatus } from "./table";
export { MantineReactTable } from "mantine-react-table";
export type { MRT_ColumnDef, MRT_TableOptions } from "mantine-react-table";
export { useTranslatedMantineReactTable } from "./table/use-translated-mantine-react-table";
