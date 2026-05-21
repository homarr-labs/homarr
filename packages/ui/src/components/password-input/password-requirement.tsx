import { rem, Text } from "@mantine/core";
import { IconCheck, IconPoint } from "@tabler/icons-react";

const requirementDisplay = {
  met: { color: "teal", Icon: IconCheck },
  unmet: { color: "dimmed", Icon: IconPoint },
} as const;

const displayKey = {
  true: "met",
  false: "unmet",
} as const;

export function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  const display = requirementDisplay[displayKey[String(meets) as "true" | "false"]];
  const Icon = display.Icon;

  return (
    <Text c={display.color} display="flex" style={{ alignItems: "center" }} size="sm">
      <Icon style={{ width: rem(14), height: rem(14) }} />
      <Text span ml={10}>
        {label}
      </Text>
    </Text>
  );
}
