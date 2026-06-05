import type { PropsWithChildren } from "react";
import { Card } from "@mantine/core";

interface InitStepCardProps {
  withBorder?: boolean;
}

export const InitStepCard = ({ children, withBorder = true }: PropsWithChildren<InitStepCardProps>) => (
  <Card w="100%" withBorder={withBorder}>
    {children}
  </Card>
);
