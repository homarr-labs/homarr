import { Stack, Text, Title } from "@mantine/core";

export const InitTitle = ({ title, description }: { title: string; description: string }) => {
  return (
    <Stack gap={6} align="center">
      <Title order={3} fw={400} ta="center">
        {title}
      </Title>
      <Text size="sm" c="gray.5" ta="center">
        {description}
      </Text>
    </Stack>
  );
};
