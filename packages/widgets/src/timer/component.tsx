"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery, useReducedMotion } from "@mantine/hooks";
import { IconBell, IconPlayerPause, IconPlayerPlay, IconRefresh, IconSettings, IconVolume } from "@tabler/icons-react";
import { useTiks } from "@rexa-developer/tiks/react";

import { useI18n } from "@homarr/translation/client";

import {
  claimBrowserAlertOccurrence,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "../common/browser-alert";
import { useLocalWidgetState } from "../common/use-local-widget-state";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import {
  createTimerRuntime,
  getRemainingMs,
  isTimerRuntimeState,
  migrateTimerRuntimeState,
  pauseTimerRuntime,
  reconcileTimerRuntime,
  resetTimerRuntime,
  setTimerAlertPreference,
  startTimerRuntime,
  synchronizeTimerRuntime,
} from "./runtime";
import type { TimerDurations, TimerRuntimeState } from "./runtime";

const completionSoundCount = 5;
const completionSoundIntervalMs = 300;

export default function TimerWidget({
  boardId,
  displayMode,
  height,
  isEditMode,
  itemId,
  options,
  width,
}: WidgetComponentProps<"timer">) {
  const now = useWidgetNow("second");
  const t = useI18n("widget.timer");
  const reducedMotion = useReducedMotion();
  const forcedColors = useMediaQuery("(forced-colors: active)") ?? false;
  const { click: playResetSound, toggle: playRunningSound } = useTiks({
    theme: "soft",
    volume: 0.12,
    respectReducedMotion: true,
  });
  const { notify: playCompletionSound } = useTiks({
    theme: "glass",
    volume: 0.12,
    respectReducedMotion: true,
  });
  const durations = useMemo<TimerDurations>(
    () => ({
      timerMinutes: options.timerMinutes,
      focusMinutes: options.focusMinutes,
      shortBreakMinutes: options.shortBreakMinutes,
      longBreakMinutes: options.longBreakMinutes,
      sessionsBeforeLongBreak: options.sessionsBeforeLongBreak,
      autoStartBreaks: options.autoStartBreaks,
      autoStartFocus: options.autoStartFocus,
    }),
    [
      options.autoStartBreaks,
      options.autoStartFocus,
      options.focusMinutes,
      options.longBreakMinutes,
      options.sessionsBeforeLongBreak,
      options.shortBreakMinutes,
      options.timerMinutes,
    ],
  );
  const storagePrefix = boardId && itemId ? `homarr:timer:${boardId}:${itemId}` : undefined;
  const [runtime, setRuntime] = useLocalWidgetState<TimerRuntimeState>({
    key: storagePrefix ? `${storagePrefix}:state` : undefined,
    version: 3,
    defaultValue: () => createTimerRuntime(options.mode, durations),
    validate: isTimerRuntimeState,
    migrate: migrateTimerRuntimeState,
  });
  const [notificationPermission, setNotificationPermission] = useState(() => getBrowserNotificationPermission());
  const [attentionFlash, setAttentionFlash] = useState(false);
  const historyInitializedRef = useRef(false);
  const handledHistoryIdRef = useRef<string | null>(null);
  const completionSoundTimeoutRef = useRef<number | null>(null);
  const attentionFlashTimeoutRef = useRef<number | null>(null);
  const stopCompletionSoundSequence = useCallback(() => {
    if (completionSoundTimeoutRef.current !== null) {
      window.clearTimeout(completionSoundTimeoutRef.current);
      completionSoundTimeoutRef.current = null;
    }
    if (attentionFlashTimeoutRef.current !== null) {
      window.clearTimeout(attentionFlashTimeoutRef.current);
      attentionFlashTimeoutRef.current = null;
    }
    setAttentionFlash(false);
  }, []);
  const flashAttention = useCallback(() => {
    if (attentionFlashTimeoutRef.current !== null) {
      window.clearTimeout(attentionFlashTimeoutRef.current);
    }
    setAttentionFlash(true);
    attentionFlashTimeoutRef.current = window.setTimeout(() => {
      attentionFlashTimeoutRef.current = null;
      setAttentionFlash(false);
    }, 180);
  }, []);

  useEffect(() => {
    setRuntime((current) => synchronizeTimerRuntime(current, options.mode, durations));
  }, [durations, options.mode, setRuntime]);

  useEffect(() => {
    if (!now) return;
    setRuntime((current) => reconcileTimerRuntime(current, now.getTime(), durations));
  }, [durations, now, setRuntime]);

  useEffect(() => {
    const latest = runtime.history.at(-1);
    if (!historyInitializedRef.current) {
      historyInitializedRef.current = true;
      handledHistoryIdRef.current = latest?.id ?? null;
      return;
    }
    if (!latest || handledHistoryIdRef.current === latest.id) return;
    handledHistoryIdRef.current = latest.id;

    const alertKey = storagePrefix ? `${storagePrefix}:alerted-completions` : undefined;
    if (alertKey && !claimBrowserAlertOccurrence(alertKey, latest.id)) return;
    if (runtime.alerts.notifications) {
      showBrowserNotification({
        title: t("alert.title"),
        body: t("alert.completed", { phase: t(`phase.${latest.phase}`) }),
        tag: latest.id,
      });
    }
    if (!runtime.alerts.sound) return;
    stopCompletionSoundSequence();
    playCompletionSound();
    if (!runtime.awaitingManualStart) return;
    flashAttention();

    let remainingSounds = completionSoundCount - 1;
    const playNextSound = () => {
      completionSoundTimeoutRef.current = window.setTimeout(() => {
        completionSoundTimeoutRef.current = null;
        playCompletionSound();
        flashAttention();
        remainingSounds -= 1;
        if (remainingSounds > 0) playNextSound();
      }, completionSoundIntervalMs);
    };
    playNextSound();
  }, [
    playCompletionSound,
    flashAttention,
    runtime.alerts.notifications,
    runtime.alerts.sound,
    runtime.awaitingManualStart,
    runtime.history,
    stopCompletionSoundSequence,
    storagePrefix,
    t,
  ]);

  useEffect(() => {
    if (runtime.awaitingManualStart && runtime.alerts.sound) return;
    stopCompletionSoundSequence();
  }, [runtime.alerts.sound, runtime.awaitingManualStart, stopCompletionSoundSequence]);

  useEffect(() => stopCompletionSoundSequence, [stopCompletionSoundSequence]);

  if (!now) {
    return (
      <Stack h="100%" align="center" justify="center">
        <Text c="dimmed">—</Text>
      </Stack>
    );
  }

  const nowMs = now.getTime();
  const remainingMs = getRemainingMs(runtime, nowMs);
  const phaseDurationMs = runtime.totalDurationMs;
  let progress = 0;
  if (phaseDurationMs > 0) {
    progress = Math.min(100, Math.max(0, ((phaseDurationMs - remainingMs) / phaseDurationMs) * 100));
  }
  const controlSize = getTimerControlSize(width, height, displayMode);
  const attentionStyle = getTimerAttentionStyle({
    awaitingManualStart: runtime.awaitingManualStart,
    flash: attentionFlash,
    forcedColors,
    reducedMotion,
  });
  const toggleRunning = () => {
    if (runtime.alerts.sound) playRunningSound(runtime.status !== "running");
    if (runtime.status === "running") {
      setRuntime((current) => pauseTimerRuntime(current, nowMs));
      return;
    }
    setRuntime((current) => startTimerRuntime(current, nowMs, durations));
  };
  const reset = () => {
    if (runtime.alerts.sound) playResetSound();
    setRuntime((current) => resetTimerRuntime(current, durations));
  };
  const setNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setRuntime((current) => setTimerAlertPreference(current, "notifications", false));
      return;
    }
    const permission = await requestBrowserNotificationPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setRuntime((current) => setTimerAlertPreference(current, "notifications", true));
    }
  };
  const setSound = (enabled: boolean) => {
    playRunningSound(enabled);
    setRuntime((current) => setTimerAlertPreference(current, "sound", enabled));
  };

  const shared = {
    disabled: isEditMode,
    attentionStyle,
    controlSize,
    height,
    onReset: reset,
    onToggleRunning: toggleRunning,
    progress,
    remainingMs,
    runtime,
    width,
  };

  if (displayMode !== "advanced") return <CompactTimer {...shared} />;

  return (
    <AdvancedTimer
      {...shared}
      durations={durations}
      notificationPermission={notificationPermission}
      onNotificationsChange={setNotifications}
      onSoundChange={setSound}
    />
  );
}

type TimerControlSize = "sm" | "md" | "lg";

interface TimerDisplayProps {
  attentionStyle: CSSProperties;
  controlSize: TimerControlSize;
  disabled: boolean;
  height: number;
  onReset: () => void;
  onToggleRunning: () => void;
  progress: number;
  remainingMs: number;
  runtime: TimerRuntimeState;
  width: number;
}

const CompactTimer = ({
  attentionStyle,
  controlSize,
  disabled,
  height,
  onReset,
  onToggleRunning,
  progress,
  remainingMs,
  runtime,
  width,
}: TimerDisplayProps) => {
  const t = useI18n("widget.timer");
  const phaseLabel = getTimerPhaseLabel(runtime, t);
  const showCompletedFocus = runtime.mode === "pomodoro" && width >= 320;
  const showProgress = height >= 125;
  let phaseBadgeMaxWidth = "calc(100% - var(--mantine-spacing-md))";
  if (showCompletedFocus) phaseBadgeMaxWidth = "60%";
  return (
    <Stack
      h="100%"
      w="100%"
      align="center"
      justify="center"
      gap="xs"
      p="xs"
      style={{ ...attentionStyle, overflow: "hidden", position: "relative" }}
    >
      <Badge
        variant="light"
        size="xs"
        h="auto"
        maw={phaseBadgeMaxWidth}
        py="calc(var(--mantine-spacing-xs) / 2)"
        aria-live="polite"
        style={{
          insetInlineStart: "var(--mantine-spacing-xs)",
          position: "absolute",
          top: "var(--mantine-spacing-xs)",
        }}
        styles={{
          label: {
            lineHeight: "var(--mantine-line-height-xs)",
            overflow: "visible",
            textOverflow: "clip",
            whiteSpace: "normal",
          },
        }}
      >
        {phaseLabel}
      </Badge>
      {showCompletedFocus && (
        <Text
          size="xs"
          c="dimmed"
          style={{
            insetInlineEnd: "var(--mantine-spacing-xs)",
            position: "absolute",
            top: "var(--mantine-spacing-xs)",
          }}
        >
          {t("compact.completedFocus", { count: runtime.completedFocusSessions })}
        </Text>
      )}
      <Text component="time" fz="xl" fw={700} lh={1} style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatTimerDuration(remainingMs)}
      </Text>
      {showProgress && (
        <Progress w="100%" value={progress} aria-label={t("progress", { progress: Math.round(progress) })} />
      )}
      <TimerControls
        controlSize={controlSize}
        disabled={disabled}
        isRunning={runtime.status === "running"}
        onReset={onReset}
        onToggleRunning={onToggleRunning}
      />
    </Stack>
  );
};

interface AdvancedTimerProps extends TimerDisplayProps {
  durations: TimerDurations;
  notificationPermission: ReturnType<typeof getBrowserNotificationPermission>;
  onNotificationsChange: (enabled: boolean) => Promise<void>;
  onSoundChange: (enabled: boolean) => void;
}

const AdvancedTimer = ({
  attentionStyle,
  controlSize,
  disabled,
  durations,
  notificationPermission,
  onNotificationsChange,
  onReset,
  onSoundChange,
  onToggleRunning,
  progress,
  remainingMs,
  runtime,
}: AdvancedTimerProps) => {
  const t = useI18n("widget.timer");
  const phaseLabel = getTimerPhaseLabel(runtime, t);
  return (
    <ScrollArea h="100%" w="100%">
      <Stack gap="md" p="md">
        <Paper
          withBorder
          p="lg"
          style={{
            ...attentionStyle,
            background:
              "linear-gradient(145deg, var(--mantine-primary-color-light), var(--mantine-color-secondaryColor-light))",
          }}
        >
          <Stack align="center" gap="sm">
            <Badge variant="light" size="sm" aria-live="polite">
              {phaseLabel}
            </Badge>
            <Text
              component="time"
              fz="var(--mantine-h1-font-size)"
              fw={700}
              lh={1}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatTimerDuration(remainingMs)}
            </Text>
            <Progress w="100%" value={progress} aria-label={t("progress", { progress: Math.round(progress) })} />
            <TimerControls
              controlSize={controlSize}
              disabled={disabled}
              isRunning={runtime.status === "running"}
              onReset={onReset}
              onToggleRunning={onToggleRunning}
            />
          </Stack>
        </Paper>

        {runtime.mode === "pomodoro" && <PomodoroSequence runtime={runtime} durations={durations} />}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper withBorder p="md">
            <Group gap="xs" mb="sm">
              <IconSettings size={18} aria-hidden />
              <Text fw={600}>{t("advanced.settings")}</Text>
            </Group>
            <SettingsSummary mode={runtime.mode} durations={durations} />
            <Text size="xs" c="dimmed" mt="sm">
              {t("advanced.settingsHint")}
            </Text>
          </Paper>

          <Paper withBorder p="md">
            <Group gap="xs" mb="sm">
              <IconBell size={18} aria-hidden />
              <Text fw={600}>{t("advanced.localAlerts")}</Text>
            </Group>
            <Stack gap="sm">
              <Switch
                checked={runtime.alerts.notifications && notificationPermission === "granted"}
                disabled={disabled || notificationPermission === "unsupported" || notificationPermission === "denied"}
                label={t("advanced.notifications")}
                onChange={(event) => void onNotificationsChange(event.currentTarget.checked)}
              />
              <Switch
                checked={runtime.alerts.sound}
                disabled={disabled}
                label={t("advanced.sound")}
                onChange={(event) => onSoundChange(event.currentTarget.checked)}
                thumbIcon={<IconVolume size={12} />}
              />
              <Text size="xs" c="dimmed">
                {t("advanced.localAlertsHint")}
              </Text>
              {notificationPermission === "denied" && <Alert color="yellow">{t("advanced.notificationsDenied")}</Alert>}
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
};

const TimerControls = ({
  controlSize,
  disabled,
  isRunning,
  onReset,
  onToggleRunning,
}: {
  controlSize: TimerControlSize;
  disabled: boolean;
  isRunning: boolean;
  onReset: () => void;
  onToggleRunning: () => void;
}) => {
  const t = useI18n("widget.timer");
  const toggleLabel = isRunning ? t("action.pause") : t("action.start");
  return (
    <Group gap="xs" wrap="nowrap">
      <Tooltip label={toggleLabel}>
        <ActionIcon
          size={controlSize}
          variant="filled"
          disabled={disabled}
          onClick={onToggleRunning}
          aria-label={toggleLabel}
        >
          {isRunning ? <IconPlayerPause /> : <IconPlayerPlay />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("action.reset")}>
        <ActionIcon
          size={controlSize}
          variant="light"
          disabled={disabled}
          onClick={onReset}
          aria-label={t("action.reset")}
        >
          <IconRefresh />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

type ScopedTimerTranslator = ReturnType<typeof useI18n<"widget.timer">>;

const getTimerPhaseLabel = (runtime: TimerRuntimeState, t: ScopedTimerTranslator) => {
  const phase = t(`phase.${runtime.phase}`);
  if (!runtime.awaitingManualStart) return phase;
  if (runtime.mode === "timer") return t("attention.timerComplete");
  return t("attention.phaseReady", { phase });
};

const getTimerControlSize = (
  width: number,
  height: number,
  displayMode: "compact" | "advanced" | undefined,
): TimerControlSize => {
  if (displayMode === "advanced") return "lg";
  if (width < 150 || height < 115) return "sm";
  if (width < 220 || height < 150) return "md";
  return "lg";
};

const getTimerAttentionStyle = ({
  awaitingManualStart,
  flash,
  forcedColors,
  reducedMotion,
}: {
  awaitingManualStart: boolean;
  flash: boolean;
  forcedColors: boolean;
  reducedMotion: boolean;
}): CSSProperties => {
  if (forcedColors && awaitingManualStart) {
    return {
      outline: "0.125rem solid Highlight",
      outlineOffset: "0.125rem",
    };
  }
  if (reducedMotion && awaitingManualStart) {
    return {
      boxShadow:
        "inset 0 0 1rem 0.125rem color-mix(in srgb, var(--mantine-color-secondaryColor-filled) 45%, transparent)",
    };
  }
  if (!flash) {
    return {
      boxShadow: "none",
      transition: "box-shadow 0.12s ease-out",
    };
  }
  return {
    boxShadow:
      "inset 0 0 1rem 0.125rem color-mix(in srgb, var(--mantine-color-secondaryColor-filled) 45%, transparent), 0 0 3rem 0.875rem color-mix(in srgb, var(--mantine-color-secondaryColor-filled) 40%, transparent)",
    transition: "box-shadow 0.12s ease-out",
  };
};

const PomodoroSequence = ({ runtime, durations }: { runtime: TimerRuntimeState; durations: TimerDurations }) => {
  const t = useI18n("widget.timer");
  return (
    <Paper withBorder p="md">
      <Text fw={600} mb="xs">
        {t("advanced.sequence")}
      </Text>
      <Group gap="xs" wrap="wrap">
        {Array.from({ length: durations.sessionsBeforeLongBreak }, (_, index) => (
          <Group key={index} gap={4} wrap="nowrap">
            <Badge variant={index < runtime.completedFocusSessions ? "filled" : "light"}>
              {t("advanced.focusSession", { session: index + 1 })}
            </Badge>
            <Text size="xs" c="dimmed">
              {t("phase.shortBreak")}
            </Text>
          </Group>
        ))}
        <Badge color="violet" variant={runtime.phase === "longBreak" ? "filled" : "light"}>
          {t("phase.longBreak")}
        </Badge>
      </Group>
    </Paper>
  );
};

const SettingsSummary = ({ mode, durations }: { mode: TimerRuntimeState["mode"]; durations: TimerDurations }) => {
  const t = useI18n("widget.timer");
  if (mode === "timer") return <SettingLine label={t("option.timerMinutes.label")} value={durations.timerMinutes} />;
  return (
    <Stack gap={5}>
      <SettingLine label={t("option.focusMinutes.label")} value={durations.focusMinutes} />
      <SettingLine label={t("option.shortBreakMinutes.label")} value={durations.shortBreakMinutes} />
      <SettingLine label={t("option.longBreakMinutes.label")} value={durations.longBreakMinutes} />
      <SettingLine label={t("option.sessionsBeforeLongBreak.label")} value={durations.sessionsBeforeLongBreak} />
    </Stack>
  );
};

const SettingLine = ({ label, value }: { label: string; value: number }) => (
  <Group justify="space-between" gap="md" wrap="nowrap">
    <Text size="sm" c="dimmed">
      {label}
    </Text>
    <Text size="sm" fw={600}>
      {value}
    </Text>
  </Group>
);

export const formatTimerDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");
  if (hours === 0) return `${minuteText}:${secondText}`;
  return `${String(hours).padStart(2, "0")}:${minuteText}:${secondText}`;
};
