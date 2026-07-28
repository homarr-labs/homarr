"use client";

import type { ReactNode } from "react";
import { Box, Center, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface WidgetQueryProvenance {
  error?: unknown;
  failedIntegrationCount?: number;
  staleIntegrationCount?: number;
  expectedIntegrationCount?: number;
  receivedIntegrationCount?: number;
}

export const hasWidgetDataWarning = ({
  error,
  failedIntegrationCount = 0,
  staleIntegrationCount = 0,
  expectedIntegrationCount,
  receivedIntegrationCount,
}: WidgetQueryProvenance) =>
  Boolean(error) ||
  failedIntegrationCount > 0 ||
  staleIntegrationCount > 0 ||
  (expectedIntegrationCount !== undefined &&
    receivedIntegrationCount !== undefined &&
    receivedIntegrationCount < expectedIntegrationCount);

export const throwOnInitialQueryError = (error: unknown, hasData: boolean) => {
  if (error && !hasData) throw error;
};

interface WidgetDataStateProps {
  children: ReactNode;
  hasWarning: boolean;
}

export function WidgetDataState({ children, hasWarning }: WidgetDataStateProps) {
  const t = useI18n();
  const label = t("board.mobile.dataWarning");

  return (
    <Box pos="relative" h="100%" w="100%">
      {children}
      {hasWarning && (
        <Tooltip label={label} position="left" withArrow events={{ hover: true, focus: true, touch: true }}>
          <Center
            component="output"
            aria-label={label}
            tabIndex={0}
            pos="absolute"
            bottom={4}
            w={28}
            h={28}
            style={{
              insetInlineStart: 4,
              zIndex: 4,
              borderRadius: "var(--mantine-radius-sm)",
              background: "light-dark(var(--mantine-color-yellow-1), var(--mantine-color-dark-6))",
            }}
          >
            <IconAlertTriangle
              size={16}
              color="light-dark(var(--mantine-color-yellow-9), var(--mantine-color-yellow-3))"
              aria-hidden
            />
          </Center>
        </Tooltip>
      )}
    </Box>
  );
}
