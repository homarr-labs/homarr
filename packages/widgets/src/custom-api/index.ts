import { IconApi, IconPlayerPause } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

const createOptions = () =>
  optionsBuilder.from((factory) => ({
    definitionId: factory.customWidgetSelect({ defaultValue: "" }),
    refreshInterval: factory.slider({
      defaultValue: 30,
      validate: z.number().min(1).max(3600),
      step: 1,
      withDescription: true,
    }),
  }));

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconApi,
  queryKey: [["widget", "customApi", "getData"]],
  queryMatcher: ({ input }, scope) => widgetQueryInputMatches(input, { definitionId: scope.options.definitionId }),
  contextActions: ({ options, widgetRuntimeRef }) => {
    return [
      {
        key: "togglePolling",
        label: "widget.customApi.actions.togglePolling",
        icon: IconPlayerPause,
        hidden: typeof options.definitionId !== "string" || options.definitionId.trim() === "",
        disabled: typeof widgetRuntimeRef.current.actions.togglePolling !== "function",
        onClick: () => {
          widgetRuntimeRef.current.actions.togglePolling?.();
        },
      },
    ];
  },
  createOptions,
}).withDynamicImport(() => import("./component"));
