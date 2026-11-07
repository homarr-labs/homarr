import { Group, Kbd } from "@mantine/core";

const hints = [
  { keys: "Alt + arrows", label: "move", description: "Alt/Option + any arrow key to move" },
  { keys: "Alt ⇧ + arrows", label: "resize", description: "Alt/Option + Shift + any arrow key to resize" },
];

export const KeyboardHints = ({
  configuring = false,
  section = "all",
}: {
  configuring?: boolean;
  section?: "navigation" | "geometry" | "all";
}) => (
  <Group gap={6} c="dimmed" fz={11} lh={1.3} w={section === "navigation" ? undefined : "100%"} style={{ rowGap: 4 }}>
    {section !== "geometry" && (
      <>
        {!configuring && (
          <Group gap={3} wrap="nowrap" title="Arrow keys to browse" aria-label="Arrow keys to browse">
            <Kbd size="xs" fz={10} px={4} py={1}>
              ↑↓
            </Kbd>
          </Group>
        )}
        <Group gap={3} wrap="nowrap">
          <Kbd size="xs" fz={10} px={4} py={1}>
            ↵
          </Kbd>
          <span>{configuring ? "confirm" : "pick"}</span>
        </Group>
        <Group gap={3} wrap="nowrap">
          <Kbd size="xs" fz={10} px={4} py={1}>
            Esc
          </Kbd>
          <span>{configuring ? "back" : "close"}</span>
        </Group>
      </>
    )}
    {section !== "navigation" &&
      hints.map(({ keys, label, description }) => (
        <Group key={label} gap={3} wrap="nowrap" title={description} aria-label={description}>
          <Kbd size="xs" fz={10} px={4} py={1} style={{ whiteSpace: "nowrap" }}>
            {keys}
          </Kbd>
          <span>{label}</span>
        </Group>
      ))}
  </Group>
);
