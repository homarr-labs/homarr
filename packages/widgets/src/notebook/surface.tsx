import type { ComponentProps, PropsWithChildren } from "react";
import { Box, Group, Text, Tooltip } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export const getNotebookSurface = ({
  width,
  height,
  displayMode,
  displayScale,
}: {
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  displayScale: number;
}) => {
  let scale = 1;
  if (displayMode !== "advanced" && Number.isFinite(displayScale) && displayScale > 0) scale = displayScale;
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  const compactSurface = renderedWidth < 280 || renderedHeight < 240;
  return { renderedWidth, renderedHeight, compactSurface, compact: displayMode === "compact" && compactSurface };
};

export const NotebookSurface = ({
  compact,
  onDoubleClick,
  children,
}: PropsWithChildren<{
  compact: boolean;
  onDoubleClick: ComponentProps<"div">["onDoubleClick"];
}>) => (
  <Box
    className="homarr-notebook"
    data-notebook-compact={compact || undefined}
    h="100%"
    onDoubleClick={onDoubleClick}
    style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}
  >
    {children}
  </Box>
);

export const NotebookFooter = ({
  saveError,
  showDocumentStats,
  text,
}: {
  saveError: string | null;
  showDocumentStats: boolean;
  text: string;
}) => {
  const t = useI18n("widget.notebook");
  if (!saveError && !showDocumentStats) return null;
  const trimmed = text.trim();
  const stats = { characters: trimmed.length, words: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length };
  return (
    <Group
      w="100%"
      justify="flex-end"
      gap="xs"
      px={8}
      pb={4}
      style={{ flex: "0 0 auto", pointerEvents: saveError ? undefined : "none" }}
    >
      {saveError && (
        <Tooltip label={saveError} multiline>
          <Text size="xs" c="red" lineClamp={1} maw={320} tabIndex={0} aria-label={`${t("saveFailed")}. ${saveError}`}>
            {t("saveFailed")}
          </Text>
        </Tooltip>
      )}
      {showDocumentStats && (
        <Text size="xs" c="dimmed">
          {t("documentStats", stats)}
        </Text>
      )}
    </Group>
  );
};
