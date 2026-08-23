import { IconSearch, IconZoomQuestion } from "@tabler/icons-react";
import { z } from "zod/v4";

import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition, widgetQueryInputMatches } from "../../definition";
import { optionsBuilder } from "../../options";

const mediaRequestStatusValues = ["pending", "approved", "declined", "failed", "completed"] as const;
const createOptions = () =>
  optionsBuilder.from((factory) => ({
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

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestList", {
  supportsAdvancedFocus: false,
  icon: IconZoomQuestion,
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      integrationIds: scope.integrationIds,
      statuses:
        Array.isArray(scope.options.statusFilter) && scope.options.statusFilter.length > 0
          ? scope.options.statusFilter
          : mediaRequestStatusValues,
      recentDays: scope.options.recentDays,
    }),
  createOptions,
  contextActions: ({ integrationIds }) => [
    {
      key: "search",
      label: "search.mode.media.action.search.label",
      icon: IconSearch,
      onClick: () => {
        openMediaRequestSearch({ integrationIds });
      },
    },
  ],
}).withDynamicImport(() => import("./component"));
