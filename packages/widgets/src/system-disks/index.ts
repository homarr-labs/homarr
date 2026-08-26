import { IconServer2 } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { createStorageVolumeMultiSelectOptions } from "../storage-volume-options";

export const { definition, componentLoader } = createWidgetDefinition("systemDisks", {
  supportsAdvancedFocus: true,
  icon: IconServer2,
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 10,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid", "synology", "mock"],
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showTemperatureIfAvailable: factory.switch({ defaultValue: true }),
        displayMode: factory.select({
          options: (["percentage", "absolute", "free"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.systemDisks.option.displayMode.option.${value}.label`),
          })),
          defaultValue: "percentage",
        }),
        showBackgroundBar: factory.switch({ defaultValue: true }),
        visibleStorageVolumes: factory.integrationMultiSelect(createStorageVolumeMultiSelectOptions()),
      }),
      {
        visibleStorageVolumes: {
          shouldHide(_, integrationKinds) {
            return integrationKinds.length === 0 || !integrationKinds.every((kind) => kind === "synology");
          },
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));
