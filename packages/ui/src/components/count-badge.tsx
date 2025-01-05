import { Badge } from "@mantine/core";

interface CountBadgeProps {
  count: number;
}

export const CountBadge = ({ count }: CountBadgeProps) => {
  return <Badge variant="light">{count}</Badge>;
};
