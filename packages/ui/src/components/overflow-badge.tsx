import type { BadgeProps, MantineSpacing } from "@mantine/core";
import { Badge, Group, Popover, Stack, UnstyledButton } from "@mantine/core";

export function OverflowBadge({
  data,
  overflowCount = 3,
  disablePopover = false,
  groupGap = "xs",
  ...props
}: {
  data: string[];
  overflowCount?: number;
  disablePopover?: boolean;
  groupGap?: MantineSpacing;
} & BadgeProps) {
  const badgeProps = {
    variant: "default",
    size: "lg",
    radius: "sm",
    ...props,
  };

  const hasOverflow = data.length > overflowCount;

  const badges = data.slice(0, overflowCount).map((item) => (
    <Badge key={item} px="xs" {...badgeProps}>
      {item}
    </Badge>
  ));

  const overflowTrigger = hasOverflow ? (
    <UnstyledButton display="flex">
      <Badge px="xs" style={{ cursor: "pointer", ...badgeProps.style }} {...badgeProps}>
        +{data.length - overflowCount}
      </Badge>
    </UnstyledButton>
  ) : null;

  // Mantine mounts a Popover's machinery — the Popover itself plus its Dropdown — regardless of
  // `disabled`, and this component previously mounted both even when nothing overflowed, which is the
  // common case. That made it a per-row cost anywhere it appears in a list: this is shared UI, used by
  // media-releases (which passes `disablePopover`), releases, and the widget inputs. Returning the
  // badges directly when there is no popover to show keeps the rendered markup identical — a disabled
  // Popover.Target only forwards a ref — while creating none of the overlay components.
  if (disablePopover || !hasOverflow) {
    return (
      <Group gap={groupGap}>
        {badges}
        {overflowTrigger}
      </Group>
    );
  }

  return (
    <Popover width="content" shadow="md">
      <Group gap={groupGap}>
        {badges}
        <Popover.Target>{overflowTrigger}</Popover.Target>
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
