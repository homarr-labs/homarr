import type { ReactNode } from "react";
import { Box, Group, Stack } from "@mantine/core";

import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { logLevelConfiguration } from "@homarr/core/infrastructure/logs/constants";
import { useI18n } from "@homarr/translation/standalone/client";
import { LogFontSizeView, LogLevelView } from "@homarr/ui/source-views/recovery-operations";

import { OperationsLogContextProvider, useOperationsLogContext } from "./log-context";
import type { OperationsTerminalProps } from "./terminal";
import { OperationsTerminal } from "./terminal";

export interface OperationsLogsViewProps extends OperationsTerminalProps {
  defaultLevel: LogLevel;
  breadcrumb?: ReactNode;
  feedback?: ReactNode;
  height?: string | number;
}

export function OperationsLogsView({ defaultLevel, ...props }: OperationsLogsViewProps) {
  return (
    <OperationsLogContextProvider defaultLevel={defaultLevel}>
      <LogsContent {...props} />
    </OperationsLogContextProvider>
  );
}

function LogsContent({ breadcrumb, feedback, height, ...terminal }: Omit<OperationsLogsViewProps, "defaultLevel">) {
  const { fontSize, setFontSize, level, setLevel } = useOperationsLogContext();
  const t = useI18n();
  const label = (value: LogLevel) => `${logLevelConfiguration[value].prefix} ${t(`log.level.option.${value}`)}`;
  return (
    <Stack>
      <Group justify="space-between" align="center" wrap="nowrap">
        {breadcrumb}
        <Group gap="md" wrap="nowrap">
          <LogFontSizeView fontSize={fontSize} onChange={setFontSize} />
          <LogLevelView
            level={level}
            onChange={setLevel}
            options={[
              { value: "error", label: label("error") },
              { value: "warn", label: label("warn") },
              { value: "info", label: label("info") },
              { value: "debug", label: label("debug") },
            ]}
          />
        </Group>
      </Group>
      {feedback}
      <Box
        style={{ borderRadius: 6 }}
        h={
          height ??
          "calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-padding) - var(--app-shell-footer-offset, 0px) - var(--app-shell-padding))"
        }
        p="md"
        bg="black"
      >
        <OperationsTerminal {...terminal} />
      </Box>
    </Stack>
  );
}
