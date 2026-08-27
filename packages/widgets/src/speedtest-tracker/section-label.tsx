import type { ReactNode } from "react";
import { Text } from "@mantine/core";

export function SectionLabel({ children, uppercase = false }: { children: ReactNode; uppercase?: boolean }) {
  return (
    <Text
      size="xs"
      fw={600}
      c="dimmed"
      tt={uppercase ? "uppercase" : undefined}
      style={{ letterSpacing: uppercase ? "0.05em" : undefined }}
    >
      {children}
    </Text>
  );
}
