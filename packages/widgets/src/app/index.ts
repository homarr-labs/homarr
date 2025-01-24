import { IconApps, IconDeviceDesktopX } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("app", {
  icon: IconApps,
  createOptions: (settings) =>
    optionsBuilder.from(
      (factory) => ({
        appId: factory.app(),
        openInNewTab: factory.switch({ defaultValue: true }),
        showTitle: factory.switch({ defaultValue: true }),
        showDescriptionTooltip: factory.switch({ defaultValue: false }),
        pingEnabled: factory.switch({ defaultValue: settings.server.board.enableSimplePingByDefault }),
      }),
      {
        pingEnabled: {
          shouldHide() {
            return settings.server.board.forceDisableSimplePing;
          },
        },
      },
    ),
  errors: {
    NOT_FOUND: {
      icon: IconDeviceDesktopX,
      message: (t) => t("widget.app.error.notFound.label"),
      hideLogsLink: true,
    },
  },
}).withDynamicImport(() => import("./component"));
