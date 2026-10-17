import { z } from "zod/v4";

import type { WidgetOptionFactory } from "../../options";

export const createBeszelThresholdOptions = (factory: WidgetOptionFactory) => ({
  thresholdMode: {
    ...factory.select({
      defaultValue: "standard",
      options: [
        { value: "off", label: (t) => t("widget.beszel.options.thresholdMode.off") },
        { value: "standard", label: (t) => t("widget.beszel.options.thresholdMode.standard") },
        { value: "custom", label: (t) => t("widget.beszel.options.thresholdMode.custom") },
      ],
      withDescription: true,
    }),
    validate: z.enum(["off", "standard", "custom"]),
  },
  cpuWarningAt: factory.slider({
    defaultValue: 50,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  cpuCriticalAt: factory.slider({
    defaultValue: 80,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  memoryWarningAt: factory.slider({
    defaultValue: 50,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  memoryCriticalAt: factory.slider({
    defaultValue: 80,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  diskWarningAt: factory.slider({
    defaultValue: 50,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  diskCriticalAt: factory.slider({
    defaultValue: 80,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  gpuWarningAt: factory.slider({
    defaultValue: 50,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  gpuCriticalAt: factory.slider({
    defaultValue: 80,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  tempWarningAt: factory.slider({
    defaultValue: 70,
    validate: z.number().min(-100).max(200),
    step: 1,
    withNumberInput: true,
    suffix: " °C",
  }),
  tempCriticalAt: factory.slider({
    defaultValue: 85,
    validate: z.number().min(-100).max(200),
    step: 1,
    withNumberInput: true,
    suffix: " °C",
  }),
  batteryWarningAt: factory.slider({
    defaultValue: 20,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
  batteryCriticalAt: factory.slider({
    defaultValue: 10,
    validate: z.number().min(0).max(100),
    step: 1,
    withNumberInput: true,
    suffix: " %",
  }),
});

const hideCustomThresholds = (options: Record<string, unknown>) => options.thresholdMode !== "custom";

export const beszelThresholdFieldConfiguration = {
  cpuWarningAt: { shouldHide: hideCustomThresholds },
  cpuCriticalAt: { shouldHide: hideCustomThresholds },
  memoryWarningAt: { shouldHide: hideCustomThresholds },
  memoryCriticalAt: { shouldHide: hideCustomThresholds },
  diskWarningAt: { shouldHide: hideCustomThresholds },
  diskCriticalAt: { shouldHide: hideCustomThresholds },
  gpuWarningAt: { shouldHide: hideCustomThresholds },
  gpuCriticalAt: { shouldHide: hideCustomThresholds },
  tempWarningAt: { shouldHide: hideCustomThresholds },
  tempCriticalAt: { shouldHide: hideCustomThresholds },
  batteryWarningAt: { shouldHide: hideCustomThresholds },
  batteryCriticalAt: { shouldHide: hideCustomThresholds },
};
