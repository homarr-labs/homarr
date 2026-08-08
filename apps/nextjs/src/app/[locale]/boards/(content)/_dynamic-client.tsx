"use client";

import dynamic from "next/dynamic";
import { SimpleGrid, Skeleton, Stack } from "@mantine/core";

const BoardLoadingShell = () => (
  <Stack h="100%" p="md" aria-busy aria-label="Loading dashboard" role="status">
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {[2, 1, 2, 2, 1, 2].map((rows, index) => (
        <Skeleton
          key={index}
          data-homarr-dev-benchmark-board-shell
          height={rows * 96}
          radius="var(--mantine-radius-default)"
        />
      ))}
    </SimpleGrid>
  </Stack>
);

export const DynamicClientBoard = dynamic(() => import("./_client").then((mod) => mod.ClientBoard), {
  ssr: false,
  loading: BoardLoadingShell,
});
