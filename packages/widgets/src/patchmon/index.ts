import { IconServerOff, IconShieldCheck } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { PATCHMON_STAT_COLOR_PRESETS } from "./stat-colors";
import { patchmonOptionsSuperRefine } from "./threshold-validation";

export const { definition, componentLoader } = createWidgetDefinition("patchmon", {
  icon: IconShieldCheck,
  supportedIntegrations: ["patchmon"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showComplianceHero: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        showTotalHosts: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        showHostsNeedingUpdates: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        showSecurityUpdates: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        showUpToDateHosts: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        showHostsWithSecurityUpdates: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        showRecentUpdates24h: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        showTotalOutdatedPackages: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        showTotalRepos: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        enableThresholdColors: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        useCustomThresholds: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        hostsNeedingUpdatesThresholdMode: factory.select({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsNeedingUpdates.mode,
          withDescription: true,
          options: [
            { value: "absolute", label: (t) => t("widget.patchmon.option.thresholdMode.option.absolute") },
            { value: "percent", label: (t) => t("widget.patchmon.option.thresholdMode.option.percent") },
          ] as const,
        }),
        hostsNeedingUpdatesWarningAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsNeedingUpdates.warningAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        hostsNeedingUpdatesCriticalAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsNeedingUpdates.criticalAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        securityUpdatesThresholdMode: factory.select({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.securityUpdates.mode,
          withDescription: true,
          options: [
            { value: "absolute", label: (t) => t("widget.patchmon.option.thresholdMode.option.absolute") },
            { value: "percent", label: (t) => t("widget.patchmon.option.thresholdMode.option.percent") },
          ] as const,
        }),
        securityUpdatesWarningAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.securityUpdates.warningAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        securityUpdatesCriticalAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.securityUpdates.criticalAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        hostsWithSecurityUpdatesThresholdMode: factory.select({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsWithSecurityUpdates.mode,
          withDescription: true,
          options: [
            { value: "absolute", label: (t) => t("widget.patchmon.option.thresholdMode.option.absolute") },
            { value: "percent", label: (t) => t("widget.patchmon.option.thresholdMode.option.percent") },
          ] as const,
        }),
        hostsWithSecurityUpdatesWarningAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsWithSecurityUpdates.warningAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        hostsWithSecurityUpdatesCriticalAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.hostsWithSecurityUpdates.criticalAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        upToDateHostsThresholdMode: factory.select({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.upToDateHosts.mode,
          withDescription: true,
          options: [
            { value: "absolute", label: (t) => t("widget.patchmon.option.thresholdMode.option.absolute") },
            { value: "percent", label: (t) => t("widget.patchmon.option.thresholdMode.option.percent") },
          ] as const,
        }),
        upToDateHostsWarningAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.upToDateHosts.warningAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        upToDateHostsCriticalAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.upToDateHosts.criticalAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        totalOutdatedPackagesThresholdMode: factory.select({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.totalOutdatedPackages.mode,
          withDescription: true,
          options: [
            { value: "absolute", label: (t) => t("widget.patchmon.option.thresholdMode.option.absolute") },
            { value: "percent", label: (t) => t("widget.patchmon.option.thresholdMode.option.percent") },
          ] as const,
        }),
        totalOutdatedPackagesWarningAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.totalOutdatedPackages.warningAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        totalOutdatedPackagesCriticalAt: factory.number({
          defaultValue: PATCHMON_STAT_COLOR_PRESETS.totalOutdatedPackages.criticalAt,
          withDescription: true,
          step: 1,
          validate: z.number().int().min(0),
        }),
        showOsDistribution: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        osDisplayMode: factory.select({
          defaultValue: "bars",
          withDescription: true,
          options: [
            { value: "bars", label: (t) => t("widget.patchmon.option.osDisplayMode.option.bars") },
            { value: "donut", label: (t) => t("widget.patchmon.option.osDisplayMode.option.donut") },
          ] as const,
        }),
        osDistributionLimit: factory.select({
          defaultValue: "0",
          withDescription: true,
          options: [
            { value: "3", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.3") },
            { value: "5", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.5") },
            { value: "10", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.10") },
            { value: "0", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.all") },
          ] as const,
        }),
        showOsVersion: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
      }),
      {
        useCustomThresholds: {
          shouldHide: (options) => !options.enableThresholdColors,
        },
        hostsNeedingUpdatesThresholdMode: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        hostsNeedingUpdatesWarningAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        hostsNeedingUpdatesCriticalAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        securityUpdatesThresholdMode: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        securityUpdatesWarningAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        securityUpdatesCriticalAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        hostsWithSecurityUpdatesThresholdMode: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        hostsWithSecurityUpdatesWarningAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        hostsWithSecurityUpdatesCriticalAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        upToDateHostsThresholdMode: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        upToDateHostsWarningAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        upToDateHostsCriticalAt: { shouldHide: (options) => !options.enableThresholdColors || !options.useCustomThresholds },
        totalOutdatedPackagesThresholdMode: {
          shouldHide: (options) =>
            !options.enableThresholdColors || !options.useCustomThresholds || !options.showTotalOutdatedPackages,
        },
        totalOutdatedPackagesWarningAt: {
          shouldHide: (options) =>
            !options.enableThresholdColors || !options.useCustomThresholds || !options.showTotalOutdatedPackages,
        },
        totalOutdatedPackagesCriticalAt: {
          shouldHide: (options) =>
            !options.enableThresholdColors || !options.useCustomThresholds || !options.showTotalOutdatedPackages,
        },
        osDisplayMode: {
          shouldHide: (options) => !options.showOsDistribution,
        },
        osDistributionLimit: {
          shouldHide: (options) => !options.showOsDistribution,
        },
        showOsVersion: {
          shouldHide: (options) => !options.showOsDistribution,
        },
      },
      patchmonOptionsSuperRefine,
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.patchmon.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
