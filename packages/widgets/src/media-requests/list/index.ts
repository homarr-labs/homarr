import { IconSearch, IconZoomQuestion } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

const mediaRequestStatusValues = ["pending", "approved", "declined", "failed", "completed"] as const;

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestList", {
  icon: IconZoomQuestion,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      linksTargetNewTab: factory.switch({
        defaultValue: true,
      }),
      statusFilter: factory.multiSelect({
        defaultValue: [...mediaRequestStatusValues],
        options: mediaRequestStatusValues.map((value) => ({
          value,
          label: (t) => t(`widget.mediaRequests-requestList.status.${value}`),
        })),
      }),
      recentDays: factory.number({
        validate: z.number().min(0).max(365),
        defaultValue: 0,
      }),
    }));
  },
  contextActions: ({ integrationIds }) => [
    {
      key: "search",
      label: (t) => t("search.mode.media.action.search.label"),
      icon: IconSearch,
      onClick: () => {
        openMediaRequestSearch({ integrationIds });
      },
    },
  ],
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
}).withDynamicImport(() => import("./component"));
