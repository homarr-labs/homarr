import { IconApi, IconPlayerPause } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconApi,
  contextActions({ options, widgetStateRef }) {
    return [
      {
        key: "togglePolling",
        label: (t) => t("widget.customApi.actions.togglePolling"),
        icon: IconPlayerPause,
        hidden: typeof options.definitionId !== "string" || options.definitionId.trim() === "",
        disabled: typeof widgetStateRef.current?.togglePolling !== "function",
        onClick: () => {
          const action = widgetStateRef.current?.togglePolling;
          if (typeof action === "function") action();
        },
      },
    ];
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      definitionId: factory.customWidgetSelect({ defaultValue: "" }),
      refreshInterval: factory.slider({
        defaultValue: 30,
        validate: z.number().min(1).max(3600),
        step: 1,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
