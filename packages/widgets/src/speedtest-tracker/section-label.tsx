import type { ReactNode } from "react";
import { Text } from "@mantine/core";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text size="xs" fw={600} c="dimmed">
      {children}
    </Text>
  );
}
