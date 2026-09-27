import { SimpleGrid, Skeleton, Stack } from "@mantine/core";

export const BoardLoadingShell = () => (
  <Stack component="output" h="100%" p="md" aria-busy aria-label="Loading dashboard">
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {[2, 1, 2, 2, 1, 2].map((rows, index) => (
        <Skeleton key={index} height={rows * 96} radius="var(--mantine-radius-default)" />
      ))}
    </SimpleGrid>
  </Stack>
);
