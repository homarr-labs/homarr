import type { BadgeProps } from "@mantine/core";
import { ActionIcon, Badge, Group, Popover, Stack } from "@mantine/core";

export function OverflowBadge({
  data,
  overflowCount = 3,
  ...props
}: {
  data: string[];
  overflowCount?: number;
} & BadgeProps) {
  const badgeProps = {
    variant: "default",
    size: "lg",
    radius: "sm",
    ...props,
  };
  return (
    <Popover width="content" shadow="md">
      <Group gap="xs">
        {data.slice(0, overflowCount).map((item) => (
          <Badge key={item} px="xs" {...badgeProps}>
            {item}
          </Badge>
        ))}
        {data.length > overflowCount && (
          <Popover.Target>
            <ActionIcon
              {...{
                variant: badgeProps.variant,
                color: badgeProps.color,
              }}
              size="sm"
              fw="bold"
              fz="sm"
              p="sm"
              px="md"
            >
              +{data.length - overflowCount}
            </ActionIcon>
          </Popover.Target>
        )}
      </Group>
      <Popover.Dropdown>
        <Stack>
          {data.slice(overflowCount).map((item) => (
            <Badge key={item} {...badgeProps}>
              {item}
            </Badge>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
