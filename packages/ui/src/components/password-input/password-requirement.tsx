import { rem, Text } from "@mantine/core";
import { IconCheck, IconPoint } from "@tabler/icons-react";

const getRequirementDisplay = (meets: boolean) =>
  ({
    true: { color: "teal", Icon: IconCheck },
    false: { color: "dimmed", Icon: IconPoint },
  })[String(meets) as "true" | "false"];

export function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  const display = getRequirementDisplay(meets);
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
