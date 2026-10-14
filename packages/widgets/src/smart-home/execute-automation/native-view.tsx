"use client";

import type { CSSProperties } from "react";
import {
  Box,
  Center,
  LoadingOverlay,
  Overlay,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { IconAutomation, IconCheck } from "@tabler/icons-react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { isSmartHomeTiny } from "../layout";

export interface SmartHomeAutomationViewProps {
  options: { automationId: string; displayName: string };
  integrationId: string | undefined;
  canInteract: boolean;
  isEditMode: boolean;
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  lastExecutedAt: Date | null;
  isShowSuccess: boolean;
  isPending: boolean;
  error: boolean;
  handleClick: () => Promise<void>;
  zoomCompensatedSize: (size: number) => CSSProperties;
}

export function SmartHomeAutomationView({
  options,
  integrationId,
  canInteract,
  isEditMode,
  width,
  height,
  displayMode,
  lastExecutedAt,
  isShowSuccess,
  isPending,
  error,
  handleClick,
  zoomCompensatedSize,
}: SmartHomeAutomationViewProps) {
  const t = useI18n("widget.smartHome-executeAutomation");
  const locale = useCurrentIntlLocale();

  const isTiny = isSmartHomeTiny(width, height);

  return (
    <Box pos="relative" w="100%" h="100%">
      <VisuallyHidden component="output">
        {isPending ? t("status.running") : isShowSuccess ? t("status.success") : ""}
      </VisuallyHidden>
      {error && <VisuallyHidden role="alert">{t("error.executeFailed")}</VisuallyHidden>}
      <UnstyledButton
        onClick={handleClick}
        disabled={!integrationId || !canInteract || isPending}
        aria-label={t("spotlightAction.run", { name: options.displayName })}
        style={{
          cursor: !isEditMode && integrationId && canInteract ? "pointer" : "initial",
          pointerEvents: isEditMode ? "none" : undefined,
        }}
        aria-description={error ? t("error.executeFailed") : undefined}
        w="100%"
        h="100%"
      >
        {isShowSuccess && (
          <Overlay>
            <Center w="100%" h="100%">
              <ThemeIcon variant="filled" color="green" size="xl" radius="xl">
                <IconCheck style={{ width: "70%", height: "70%" }} stroke={1.5} />
              </ThemeIcon>
            </Center>
          </Overlay>
        )}
        <LoadingOverlay visible={isPending} />
        {error && displayMode !== "advanced" && (
          <Overlay>
            <Center w="100%" h="100%" p="xs">
              <Text size="xs" c="red" ta="center" lineClamp={3}>
                {t("error.executeFailed")}
              </Text>
            </Center>
          </Overlay>
        )}
        <Center w="100%" h="100%">
          <Stack align="center" gap={isTiny ? 6 : "md"} p="xs" maw="100%">
            <ThemeIcon variant="light" size={isTiny ? "md" : "xl"} radius="xl">
              <IconAutomation style={zoomCompensatedSize(isTiny ? 14 : 24)} />
            </ThemeIcon>
            <Text ta="center" fw={600} fz={isTiny ? "xs" : "sm"} lineClamp={2} maw="100%">
              {options.displayName}
            </Text>
            {displayMode === "advanced" && (
              <Stack gap={2} align="center">
                <Text ta="center" size="xs" c="dimmed">
                  {t("advanced.automationId", { id: options.automationId })}
                </Text>
                <Text ta="center" size="xs" c={canInteract ? "dimmed" : "orange"}>
                  {t(canInteract ? "advanced.ready" : "advanced.noPermission")}
                </Text>
                {lastExecutedAt && (
                  <Text ta="center" size="xs" c="dimmed">
                    {t("advanced.lastExecuted", {
                      time: lastExecutedAt.toLocaleTimeString(locale),
                    })}
                  </Text>
                )}
                {error && (
                  <Text ta="center" size="xs" c="red">
                    {t("error.executeFailed")}
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Center>
      </UnstyledButton>
    </Box>
  );
}
