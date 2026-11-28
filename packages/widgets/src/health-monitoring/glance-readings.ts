"use client";

import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import type { HealthMetric } from "./configuration";
import { healthMetricLabels } from "./configuration";
import { healthAlertLabel, percentage, pressureColor, temperature } from "./display";
import type { HealthOptions } from "./display";
import type { HealthSystemSnapshot } from "./model";

export interface GlanceReading {
  value: string;
  context?: string;
  description?: string;
  percent?: number;
  color?: string;
}

export function hasGlanceReading(snapshot: HealthSystemSnapshot, metric: HealthMetric) {
  switch (metric) {
    case "cpu":
      return snapshot.cpuPercent !== null;
    case "memory":
      return snapshot.memory !== null;
    case "storage":
      return snapshot.fullestVolume !== null || snapshot.storageHealth !== "unknown";
    case "temperature":
      return snapshot.temperature !== null;
    case "network":
      return snapshot.network !== null;
    case "gpu":
      return Boolean(snapshot.system.health?.gpu.length);
  }
}

function utilization(value: number, threshold: number, color: string, context?: string): GlanceReading {
  return { value: percentage(value), percent: value, color: pressureColor(value, threshold, color), context };
}

export function useGlanceReadings(options: HealthOptions) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytesPair, formatByteRate } = useByteFormatter();

  function label(metric: HealthMetric) {
    return t(healthMetricLabels[metric]);
  }

  function status(snapshot: HealthSystemSnapshot, stale: boolean) {
    if (!snapshot.available) return t("unavailable");
    if (stale) return t("staleShort");
    if (snapshot.alerts[0]) return healthAlertLabel(snapshot.alerts[0], t);
    return "";
  }

  function read(snapshot: HealthSystemSnapshot, metric: HealthMetric): GlanceReading | null {
    switch (metric) {
      case "cpu":
        if (snapshot.cpuPercent === null) return null;
        return utilization(snapshot.cpuPercent, options.cpuThreshold, "blue");
      case "memory": {
        if (!snapshot.memory) return null;
        const memory = formatBytesPair(snapshot.memory.used, snapshot.memory.total);
        return utilization(
          snapshot.memory.percent,
          options.memoryThreshold,
          "teal",
          memory.used + " / " + memory.total,
        );
      }
      case "storage": {
        const volume = snapshot.fullestVolume;
        if (volume?.percent !== null && volume?.percent !== undefined)
          return utilization(volume.percent, options.storageThreshold, "teal", volume.name);
        if (snapshot.storageHealth === "healthy") return { value: t("healthy") };
        if (snapshot.storageHealth === "attention") return { value: t("attention") };
        return null;
      }
      case "temperature":
        if (snapshot.temperature === null) return null;
        return { value: temperature(snapshot.temperature, options.fahrenheit) };
      case "network": {
        if (!snapshot.network) return null;
        const { down, up } = snapshot.network;
        const descriptions = [];
        if (down !== null) descriptions.push(t("download") + " " + formatByteRate(down));
        if (up !== null) descriptions.push(t("upload") + " " + formatByteRate(up));
        if (down !== null) {
          let context;
          if (up !== null) context = "↑ " + formatByteRate(up);
          return { value: "↓ " + formatByteRate(down), context, description: descriptions.join(", ") };
        }
        if (up !== null) return { value: "↑ " + formatByteRate(up), description: descriptions.join(", ") };
        return null;
      }
      case "gpu": {
        const devices = snapshot.system.health?.gpu;
        if (!devices?.length) return null;
        let highest: number | null = null;
        let deviceName = "";
        for (const device of devices) {
          const usage = device.processorUtilization;
          if (usage === null || !Number.isFinite(usage) || usage < 0 || usage > 100) continue;
          if (highest === null || usage > highest) {
            highest = usage;
            deviceName = device.name;
          }
        }
        if (highest !== null) {
          const value = percentage(highest);
          return {
            value,
            percent: highest,
            color: "violet",
            context: deviceName,
            description: [deviceName, t("gpuUsage") + " " + value].filter(Boolean).join(", "),
          };
        }
        return {
          value: t("gpuCount", { count: devices.length }),
          context: devices.map((device) => device.name).join(", "),
        };
      }
    }
  }

  return { label, read, status };
}
