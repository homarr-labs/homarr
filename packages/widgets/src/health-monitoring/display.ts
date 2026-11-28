import type { WidgetComponentProps } from "../definition";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { HealthAlert, HealthSystemSnapshot } from "./model";

export type HealthOptions = WidgetComponentProps<"healthMonitoring">["options"];

export function historyWindowSeconds(window: HealthOptions["historyWindow"]) {
  if (window === "15m") return 15 * 60;
  return 5 * 60;
}

export function historyWaitingMessage(
  window: HealthOptions["historyWindow"],
  refreshSeconds: number | undefined,
  t: ScopedTranslationFunction<"widget.healthMonitoring.rework">,
) {
  if (refreshSeconds !== undefined && refreshSeconds >= historyWindowSeconds(window))
    return t("historyIntervalTooLong", { seconds: refreshSeconds });
  return t("waitingHistory");
}

export function isStaleReading(
  updatedAt: number | undefined,
  now: number | undefined,
  refreshInterval = 10,
): updatedAt is number {
  if (now === undefined || updatedAt === undefined) return false;
  return now - updatedAt > Math.max(60_000, refreshInterval * 3000);
}

export function needsAttention(snapshot: HealthSystemSnapshot, now: number | undefined) {
  return (
    !snapshot.available ||
    snapshot.alerts.length > 0 ||
    isStaleReading(snapshot.system.updatedAt, now, snapshot.system.refreshInterval)
  );
}

export function healthAlertLabel(alert: HealthAlert, t: ScopedTranslationFunction<"widget.healthMonitoring.rework">) {
  if (alert.type === "reboot") return t("reboot");
  if (alert.type === "updates") return t("updates", { count: alert.count });
  if (alert.type === "storage") return t("diskIssues", { count: alert.count });
  if (alert.type === "capacity") return t("highStorage", { count: alert.count });
  if (alert.type === "cpu") return t("highCpu");
  return t("highMemory");
}

export function percentage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(1) + "%";
}

export function temperature(value: number | null | undefined, fahrenheit: boolean) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (fahrenheit) return (value * 1.8 + 32).toFixed(1) + "°F";
  return value.toFixed(1) + "°C";
}

export function pressureColor(value: number | null, threshold: number, normal: string) {
  if (value === null) return "gray";
  if (value >= threshold) return "red";
  return normal;
}

export function uptime(
  seconds: number | null | undefined,
  t: ScopedTranslationFunction<"widget.healthMonitoring.rework">,
) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return t("uptimeDays", { days, hours });
  if (hours > 0) return t("uptimeHours", { hours, minutes });
  return t("uptimeMinutes", { minutes });
}
