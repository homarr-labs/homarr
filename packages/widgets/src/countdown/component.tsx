"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBell, IconBellOff, IconHourglass } from "@tabler/icons-react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import {
  claimBrowserAlertOccurrence,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "../common/browser-alert";
import { useLocalWidgetState } from "../common/use-local-widget-state";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import { formatCountdownDuration } from "./display";
import styles from "./component.module.css";
import { getCountdownEventState, getCountdownProgress, groupCountdownStates } from "./recurrence";
import type { CountdownEventState } from "./recurrence";

interface AlertPreferences {
  notifications: boolean;
}

const defaultAlertPreferences: AlertPreferences = { notifications: false };

const isAlertPreferences = (value: unknown): value is AlertPreferences => {
  if (typeof value !== "object" || value === null) return false;
  return "notifications" in value && typeof value.notifications === "boolean";
};

const migrateAlertPreferences = (value: unknown, storedVersion: number): AlertPreferences | undefined => {
  if (storedVersion !== 1 || !isAlertPreferences(value)) return undefined;
  return { notifications: value.notifications };
};

export default function CountdownWidget({
  boardId,
  displayMode,
  isEditMode,
  itemId,
  options,
  width,
}: WidgetComponentProps<"countdown">) {
  const now = useWidgetNow(options.showSeconds ? "second" : "minute");
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.countdown");
  const storagePrefix = boardId && itemId ? `homarr:countdown:${boardId}:${itemId}` : undefined;
  const [preferences, setPreferences] = useLocalWidgetState<AlertPreferences>({
    key: storagePrefix ? `${storagePrefix}:alert-preferences` : undefined,
    version: 2,
    defaultValue: defaultAlertPreferences,
    validate: isAlertPreferences,
    migrate: migrateAlertPreferences,
  });
  const [notificationPermission, setNotificationPermission] = useState(() => getBrowserNotificationPermission());
  const previousNowRef = useRef<Date | null>(null);
  const states = useMemo(() => {
    if (!now) return [];
    return options.events.map((event) => getCountdownEventState(event, now));
  }, [now, options.events]);
  const grouped = useMemo(() => groupCountdownStates(states), [states]);

  useEffect(() => {
    if (!now || !storagePrefix) return;
    const previousNow = previousNowRef.current;
    previousNowRef.current = now;
    if (!previousNow || !preferences.notifications) return;

    states.forEach((state) => {
      const occurrence = state.previousOccurrence;
      if (!occurrence || occurrence <= previousNow || occurrence > now) return;
      const claimKey = `${storagePrefix}:alerted-occurrences`;
      const occurrenceKey = `${state.event.id}:${occurrence.toISOString()}`;
      if (!claimBrowserAlertOccurrence(claimKey, occurrenceKey)) return;
      showBrowserNotification({
        title: state.event.label,
        body: t("alert.reached"),
        tag: occurrenceKey,
      });
    });
  }, [now, preferences.notifications, states, storagePrefix, t]);

  if (!now) {
    return (
      <Stack h="100%" align="center" justify="center">
        <Text c="dimmed">—</Text>
      </Stack>
    );
  }

  const hero = states[0];
  if (!hero) {
    return (
      <Stack h="100%" align="center" justify="center" gap="xs" p="md">
        <ThemeIcon variant="light" size="xl" radius="xl">
          <IconHourglass />
        </ThemeIcon>
        <Text fw={600}>{t("empty.title")}</Text>
        <Text size="sm" c="dimmed" ta="center">
          {t("empty.description")}
        </Text>
      </Stack>
    );
  }

  let heroStatus: string | null = null;
  if (hero.invalid) heroStatus = t("invalid.value");
  else if (hero.completed) heroStatus = t("completed");

  if (displayMode !== "advanced") {
    return (
      <Stack className={styles.root} h="100%" justify="center" align="center" gap={6} p="sm">
        <Group gap="xs" wrap="nowrap" maw="100%">
          {heroStatus && (
            <Badge className={styles.compactStatus} variant="outline" size="xs" flex="0 0 auto">
              {heroStatus}
            </Badge>
          )}
          <Text size="sm" fw={600} truncate>
            {hero.event.label}
          </Text>
        </Group>
        <CountdownValue state={hero} now={now} locale={locale} showSeconds={options.showSeconds} compact />
        <Text className={styles.compactTarget} size="xs" c="dimmed" truncate maw="100%">
          {formatOccurrence(hero, locale)}
        </Text>
        {options.showProgress && (
          <ProgressBar className={styles.compactProgress} state={hero} now={now} label={t("progress")} />
        )}
      </Stack>
    );
  }

  const setNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setPreferences((current) => ({ ...current, notifications: false }));
      return;
    }
    const permission = await requestBrowserNotificationPermission();
    setNotificationPermission(permission);
    if (permission === "granted") setPreferences((current) => ({ ...current, notifications: true }));
  };
  const eventColumns = width >= 700 ? 2 : 1;

  return (
    <Stack className={styles.root} h="100%" gap="md" p="md">
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Group gap="xs" wrap="nowrap">
            {heroStatus && <Badge variant="outline">{heroStatus}</Badge>}
            <Text size="sm" c="dimmed" truncate>
              {formatOccurrence(hero, locale)}
            </Text>
          </Group>
          <Title order={2} lineClamp={1}>
            {hero.event.label}
          </Title>
          <CountdownValue state={hero} now={now} locale={locale} showSeconds={options.showSeconds} />
        </Stack>
        {options.showProgress && <ProgressBar state={hero} now={now} label={t("progress")} />}
      </Paper>

      <AlertControls
        disabled={isEditMode}
        persistent={storagePrefix !== undefined}
        preferences={preferences}
        notificationPermission={notificationPermission}
        onNotificationsChange={setNotifications}
      />

      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="md" pb="xs">
          <EventSection
            title={t("upcoming")}
            states={grouped.upcoming}
            now={now}
            locale={locale}
            showSeconds={options.showSeconds}
            showProgress={options.showProgress}
            columns={eventColumns}
          />
          <EventSection
            title={t("completedEvents")}
            states={grouped.completed}
            now={now}
            locale={locale}
            showSeconds={options.showSeconds}
            showProgress={options.showProgress}
            columns={eventColumns}
          />
          {grouped.invalid.length > 0 && (
            <Alert color="yellow" title={t("invalid.title")}>
              {t("invalid.description", { count: grouped.invalid.length })}
            </Alert>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

const CountdownValue = ({
  state,
  now,
  locale,
  showSeconds,
  compact = false,
}: {
  state: CountdownEventState;
  now: Date;
  locale: string;
  showSeconds: boolean;
  compact?: boolean;
}) => {
  const t = useI18n("widget.countdown");
  let value = t("invalid.value");
  if (state.completed) value = t("completed");
  else if (state.nextOccurrence)
    value = formatCountdownDuration(state, now, showSeconds, locale, compact ? "narrow" : "short");
  return (
    <Text
      className={compact ? `${styles.duration} ${styles.compactDuration}` : styles.duration}
      fz={compact ? undefined : 42}
      fw={750}
      lh={1.05}
      ta={compact ? "center" : undefined}
    >
      {value}
    </Text>
  );
};

const ProgressBar = ({
  className,
  state,
  now,
  label,
}: {
  className?: string;
  state: CountdownEventState;
  now: Date;
  label: string;
}) => {
  const progress = getCountdownProgress(state, now);
  if (progress === null) return null;
  return (
    <Progress
      className={className}
      mt="xs"
      value={progress}
      aria-label={`${label}: ${Math.round(progress)}%`}
      animated={false}
    />
  );
};

const EventSection = ({
  title,
  states,
  now,
  locale,
  showSeconds,
  showProgress,
  columns,
}: {
  title: string;
  states: CountdownEventState[];
  now: Date;
  locale: string;
  showSeconds: boolean;
  showProgress: boolean;
  columns: number;
}) => {
  const t = useI18n("widget.countdown");
  if (states.length === 0) return null;
  return (
    <Stack gap="xs">
      <Text fw={700}>{title}</Text>
      <SimpleGrid cols={columns} spacing="xs">
        {states.map((state) => (
          <Paper className={styles.eventCard} key={state.event.id} withBorder p="sm">
            <Stack gap={4} h="100%">
              <Group justify="space-between" wrap="nowrap">
                <Text fw={600} truncate>
                  {state.event.label}
                </Text>
                {state.event.recurrence === "yearly" && <Badge variant="outline">{t("yearly")}</Badge>}
              </Group>
              <CountdownValue state={state} now={now} locale={locale} showSeconds={showSeconds} compact />
              <Stack gap={4} mt="auto">
                {showProgress && <ProgressBar state={state} now={now} label={title} />}
                <Text size="xs" c="dimmed">
                  {formatOccurrence(state, locale)}
                </Text>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
};

const AlertControls = ({
  disabled,
  persistent,
  preferences,
  notificationPermission,
  onNotificationsChange,
}: {
  disabled: boolean;
  persistent: boolean;
  preferences: AlertPreferences;
  notificationPermission: ReturnType<typeof getBrowserNotificationPermission>;
  onNotificationsChange: (enabled: boolean) => Promise<void>;
}) => {
  const t = useI18n("widget.countdown.alert");
  if (!persistent) return null;
  return (
    <Paper withBorder p="sm" radius="md">
      <Switch
        checked={preferences.notifications && notificationPermission === "granted"}
        disabled={disabled || notificationPermission === "unsupported" || notificationPermission === "denied"}
        onChange={(event) => void onNotificationsChange(event.currentTarget.checked)}
        label={t("notifications")}
        thumbIcon={
          preferences.notifications ? (
            <IconBell style={iconSizes.sm} />
          ) : (
            <IconBellOff style={iconSizes.sm} />
          )
        }
      />
      {notificationPermission === "denied" && (
        <Text size="xs" c="dimmed" mt="xs">
          {t("permissionDenied")}
        </Text>
      )}
    </Paper>
  );
};

const formatOccurrence = (state: CountdownEventState, locale: string) => {
  const occurrence = state.nextOccurrence ?? state.previousOccurrence;
  if (!occurrence) return state.event.timeZone;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: state.event.timeZone,
  }).format(occurrence);
};
