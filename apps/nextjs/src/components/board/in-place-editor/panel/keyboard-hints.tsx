import { Group, Kbd } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export const KeyboardHints = ({
  configuring = false,
  section = "all",
}: {
  configuring?: boolean;
  section?: "navigation" | "geometry" | "all";
}) => {
  const t = useI18n();
  const hints = [
    {
      keys: "Alt + ←↑→↓",
      label: t("item.inPlace.keyboard.move"),
      description: t("item.inPlace.keyboard.moveDescription"),
    },
    {
      keys: "Alt ⇧ + ←↑→↓",
      label: t("item.inPlace.keyboard.resize"),
      description: t("item.inPlace.keyboard.resizeDescription"),
    },
  ];

  return (
    <Group gap={6} c="dimmed" fz={11} lh={1.3} w={section === "navigation" ? undefined : "100%"} style={{ rowGap: 4 }}>
      {section !== "geometry" && (
        <>
          {!configuring && (
            <Group
              gap={3}
              wrap="nowrap"
              title={t("item.inPlace.keyboard.browse")}
              aria-label={t("item.inPlace.keyboard.browse")}
            >
              <Kbd size="xs" fz={10} px={4} py={1}>
                ↑↓
              </Kbd>
            </Group>
          )}
          <Group gap={3} wrap="nowrap">
            <Kbd size="xs" fz={10} px={4} py={1}>
              ↵
            </Kbd>
            <span>{configuring ? t("common.action.confirm") : t("item.inPlace.keyboard.pick")}</span>
          </Group>
          <Group gap={3} wrap="nowrap">
            <Kbd size="xs" fz={10} px={4} py={1}>
              Esc
            </Kbd>
            <span>{configuring ? t("common.action.previous") : t("common.action.close")}</span>
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
};
