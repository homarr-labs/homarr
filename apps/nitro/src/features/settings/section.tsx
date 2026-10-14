import { Card, Divider, Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function SettingsSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <Card withBorder bg="transparent">
      <Stack gap="md">
        <Title order={3}>{title}</Title>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
}
