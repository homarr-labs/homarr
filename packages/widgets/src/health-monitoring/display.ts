import type { WidgetComponentProps } from "../definition";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { HealthAlert } from "./model";

export type HealthOptions = WidgetComponentProps<"healthMonitoring">["options"];

const staleAfterMs = 60_000;

export function isStaleReading(updatedAt: number | undefined, now: number | undefined): updatedAt is number {
  if (now === undefined || updatedAt === undefined) return false;
  return now - updatedAt > staleAfterMs;
}

export function healthAlertLabel(alert: HealthAlert, t: ScopedTranslationFunction<"widget.healthMonitoring.rework">) {
  if (alert.type === "reboot") return t("reboot");
  if (alert.type === "updates") return t("updates", { count: alert.count });
  if (alert.type === "storage") return t("diskIssues", { count: alert.count });
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

export function pressureColor(value: number | null, normal = "blue") {
  if (value === null) return "gray";
  if (value >= 90) return "red";
  if (value >= 75) return "orange";
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
