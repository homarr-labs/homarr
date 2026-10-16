import {
  IconApps,
  IconDeviceDesktopX,
  IconEyeOff,
  IconLayoutBottombarExpand,
  IconLayoutNavbarExpand,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconTextScan2,
  IconTooltip,
} from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";
import type { WidgetDataContext } from "../data";
import type { RouterOutputs } from "@homarr/api";

export const getAppPingQuery = (
  app: RouterOutputs["app"]["byId"],
  context: WidgetDataContext<{ pingEnabled: boolean }>,
) =>
  widgetQuery(
    "widget.app.ping",
    { id: app.id },
    {
      enabled:
        context.options.pingEnabled &&
        !context.settings?.forceDisableStatus &&
        !context.board?.disableStatus &&
        Boolean(app.pingUrl ?? app.href),
      stream: false,
    },
  );

export const { definition, componentLoader } = createWidgetDefinition("app", {
  icon: IconApps,
  supportsAdvancedFocus: false,
  queryKeys: [[["app", "byId"]], [["widget", "app", "ping"]]],
  createOptions(settings) {
    return optionsBuilder.from(
      (factory) => ({
        appId: factory.app(),
        openInNewTab: factory.switch({ defaultValue: true }),
        showTitle: factory.switch({ defaultValue: true }),
        descriptionDisplayMode: factory.select({
          options: [
            {
              label(t) {
                return t("widget.app.option.descriptionDisplayMode.option.normal");
              },
              value: "normal",
              icon: IconTextScan2,
            },
            {
              label(t) {
                return t("widget.app.option.descriptionDisplayMode.option.tooltip");
              },
              value: "tooltip",
              icon: IconTooltip,
            },
            {
              label(t) {
                return t("widget.app.option.descriptionDisplayMode.option.hidden");
              },
              value: "hidden",
              icon: IconEyeOff,
            },
          ],
          defaultValue: "hidden",
          searchable: true,
          withDescription: true,
        }),
        layout: factory.select({
          options: [
            {
              label(t) {
                return t("widget.common.layout.option.vertical");
              },
              value: "column",
              icon: IconLayoutNavbarExpand,
            },
            {
              label(t) {
                return t("widget.app.option.layout.option.column-reverse");
              },
              value: "column-reverse",
              icon: IconLayoutBottombarExpand,
            },
            {
              label(t) {
                return t("widget.common.layout.option.horizontal");
              },
              value: "row",
              icon: IconLayoutSidebarLeftExpand,
            },
            {
              label(t) {
                return t("widget.app.option.layout.option.row-reverse");
              },
              value: "row-reverse",
              icon: IconLayoutSidebarRightExpand,
            },
          ],
          defaultValue: "column",
          searchable: true,
        }),
        pingEnabled: factory.switch({ defaultValue: settings.enableStatusByDefault }),
      }),
      {
        pingEnabled: {
          shouldHide() {
            return settings.forceDisableStatus;
          },
        },
      },
    );
  },
  errors: {
    NOT_FOUND: {
      icon: IconDeviceDesktopX,
      message: (t) => t("widget.app.error.notFound.label"),
      hideLogsLink: true,
    },
  },
})
  .withData({
    mode: "queries",
    stream: true,
    queries: (context) => ({
      main: widgetQuery(
        "app.byId",
        { id: context.options.appId },
        {
          enabled: Boolean(context.options.appId),
          after: (app) => ({ ping: getAppPingQuery(app, context) }),
        },
      ),
    }),
  })
  .withDynamicImport(() => import("./component"));
