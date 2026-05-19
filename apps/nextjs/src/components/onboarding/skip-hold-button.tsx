"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Progress, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

const HOLD_DURATION_MS = 2000;
const TICK_INTERVAL_MS = 50;

interface SkipHoldButtonProps {
  onSkip: () => void;
}

export const SkipHoldButton = ({ onSkip }: SkipHoldButtonProps) => {
  const t = useI18n();
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHoldInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHoldInterval, [clearHoldInterval]);

  const handlePointerDown = useCallback(() => {
    clearHoldInterval();
    setProgress(0);
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += TICK_INTERVAL_MS;
      const pct = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (elapsed >= HOLD_DURATION_MS) {
        clearHoldInterval();
        onSkip();
      }
    }, TICK_INTERVAL_MS);
  }, [onSkip, clearHoldInterval]);

  const handlePointerUp = useCallback(() => {
    clearHoldInterval();
    setProgress(0);
  }, [clearHoldInterval]);

  return (
    <Stack gap={4} mt="xs">
      <Button
        size="xs"
        variant="subtle"
        color="dimmed"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Text size="xs">{t("onboardingTour.skipHold")}</Text>
      </Button>
      {progress > 0 && <Progress value={progress} size="xs" color="red" animated />}
    </Stack>
  );
};
