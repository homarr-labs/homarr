import { Container } from "@mantine/core";

import type { ManageContainerProps } from "./contracts";

export const ManageContainer = ({ children, size }: ManageContainerProps) => {
  return (
    <Container size={size} px={{ base: "0 !important", md: "var(--mantine-spacing-md) !important" }}>
      {children}
    </Container>
  );
};
