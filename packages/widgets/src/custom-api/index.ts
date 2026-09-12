import { IconApi } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconApi,
  supportsAdvancedFocus: true,
  contextActions: ({ widgetRuntimeRef }) =>
    (widgetRuntimeRef.current.commands ?? []).map((command) => ({
      key: command.id,
      label: () => command.label,
      disabled: command.disabled,
      hidden: command.hidden,
      color: command.destructive ? "red" : undefined,
      onClick: () => void command.run(),
    })),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      definitionId: factory.customWidgetSelect({ defaultValue: "" }),
      configuration: factory.customWidgetConfiguration(),
      connectionBindings: factory.internal({ defaultValue: {} as Record<string, string> }),
      configurationVersion: factory.internal({ defaultValue: 1 }),
      refreshInterval: factory.slider({
        defaultValue: 30,
        validate: z.number().min(1).max(3600),
        step: 1,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
