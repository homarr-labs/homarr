import { IconChartBar, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const timeFrameValues = ["today", "24h", "7d", "30d", "month", "lastMonth"] as const;

export const { definition, componentLoader } = createWidgetDefinition("umami", {
  icon: IconChartBar,
  supportedIntegrations: ["umami"],
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        websiteId: factory.umamiWebsite(),
        timeFrame: factory.select({
          options: timeFrameValues.map((value) => ({
            value,
            label: (t) => t(`widget.umami.option.timeFrame.option.${value}`),
          })),
          defaultValue: "24h",
          withDescription: true,
        }),
        viewMode: factory.select({
          options: [
            { value: "chart", label: (t) => t("widget.umami.option.viewMode.option.chart") },
            { value: "events", label: (t) => t("widget.umami.option.viewMode.option.events") },
            { value: "topPages", label: (t) => t("widget.umami.option.viewMode.option.topPages") },
            { value: "topReferrers", label: (t) => t("widget.umami.option.viewMode.option.topReferrers") },
          ] as const,
          defaultValue: "chart",
          withDescription: true,
        }),
        chartType: factory.select({
          options: [
            { value: "bar", label: (t) => t("widget.umami.option.chartType.option.bar") },
            { value: "sparkline", label: (t) => t("widget.umami.option.chartType.option.sparkline") },
          ] as const,
          defaultValue: "bar",
          withDescription: true,
        }),
        chartStyle: factory.select({
          options: [
            { value: "grouped", label: (t) => t("widget.umami.option.chartStyle.option.grouped") },
            { value: "overlay", label: (t) => t("widget.umami.option.chartStyle.option.overlay") },
          ] as const,
          defaultValue: "grouped",
          withDescription: true,
        }),
        eventName: factory.umamiEventName(),
        eventNames: factory.umamiEventNames(),
        topCount: factory.number({
          validate: z.number().int().min(1).max(500),
          defaultValue: 5,
          step: 1,
          withDescription: true,
        }),
      }),
      {
        viewMode: {
          shouldHide: (options) => !options.websiteId,
        },
        chartType: {
          shouldHide: (options) =>
            !options.websiteId || (options.viewMode !== "chart" && options.viewMode !== "events"),
        },
        chartStyle: {
          shouldHide: (options) => options.viewMode !== "chart" || !options.eventName || options.chartType !== "bar",
        },
        eventName: {
          shouldHide: (options) => !options.websiteId || options.viewMode !== "chart",
        },
        eventNames: {
          shouldHide: (options) => !options.websiteId || options.viewMode !== "events",
        },
        topCount: {
          shouldHide: (options) => !options.websiteId || options.viewMode === "chart" || options.viewMode === "events",
        },
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.umami.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
